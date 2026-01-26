import React, { useState } from 'react';
import {
    Search, User, Hash, Phone, Mail,
    RotateCcw, ChevronRight, ShieldCheck, Download,
    Eye, Loader2, GraduationCap
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentProfileModal } from './studentprofilemodal';
import toast from 'react-hot-toast';
// Import your skeleton components
import { TableSkeleton, ControlSkeleton } from '../../components/common/skeletoncomp';

export function StudentList() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState({ name: '', rollNo: '', contact: '', email: '' });

    const fetchStudents = async () => {
        if (!searchQuery.name && !searchQuery.rollNo && !searchQuery.contact && !searchQuery.email) {
            return toast.error("Please enter search criteria");
        }
        setLoading(true);
        try {
            let query = supabase.from('profiles').select('*').eq('role', 'student');
            if (profile?.role !== 'super-admin') query = query.eq('school_id', profile.school_id);
            if (searchQuery.name) query = query.ilike('full_name', `%${searchQuery.name}%`);
            if (searchQuery.rollNo) query = query.ilike('roll_number', `%${searchQuery.rollNo}%`);
            if (searchQuery.contact) query = query.ilike('mobile_number', `%${searchQuery.contact}%`);
            if (searchQuery.email) query = query.ilike('email', `%${searchQuery.email}%`);

            const { data, error } = await query.order('full_name', { ascending: true });
            if (error) throw error;
            setStudents(data || []);
            if (data?.length === 0) toast.error("No students found");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-3 md:p-8 bg-[#F8FAFC] min-h-screen pb-20 font-poppins relative overflow-x-hidden text-left transition-all">

            {/* --- SEARCH HUB --- */}
            <div className="bg-white p-6 md:p-10 rounded-[35px] md:rounded-[45px] shadow-xl border-2 border-white flex flex-col gap-6 md:gap-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-900 text-white rounded-[25px] md:rounded-[35px] flex items-center justify-center shadow-2xl border-4 border-white shrink-0">
                            <Search size={28} className="md:w-8 md:h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                Student <span className="text-blue-700">Search</span>
                            </h1>
                            <p className="text-slate-400 text-[9px] md:text-[11px] font-black uppercase tracking-[2px] mt-2 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500" /> Secure Database Access
                            </p>
                        </div>
                    </div>
                    <button className="hidden sm:flex p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-700 hover:text-white border-2 border-slate-100 transition-all shadow-sm active:scale-95">
                        <Download size={20} />
                    </button>
                </div>

                {/* SEARCH INPUT GRID: Fully Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t-2 border-slate-50">
                    <SearchInput icon={<User size={18} />} placeholder="Full Name" value={searchQuery.name} onChange={(v: string) => setSearchQuery({ ...searchQuery, name: v })} />
                    <SearchInput icon={<Hash size={18} />} placeholder="Roll ID" value={searchQuery.rollNo} onChange={(v: string) => setSearchQuery({ ...searchQuery, rollNo: v })} />
                    <SearchInput icon={<Phone size={18} />} placeholder="Mobile" value={searchQuery.contact} onChange={(v: string) => setSearchQuery({ ...searchQuery, contact: v })} />
                    <SearchInput icon={<Mail size={18} />} placeholder="Email" value={searchQuery.email} onChange={(v: string) => setSearchQuery({ ...searchQuery, email: v })} />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4">
                    <button 
                        onClick={() => { setStudents([]); setSearchQuery({ name: '', rollNo: '', contact: '', email: '' }); }} 
                        className="order-2 sm:order-1 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 py-3 transition-colors px-6 active:scale-95"
                    >
                        <RotateCcw size={14} /> Clear All
                    </button>
                    <button 
                        onClick={fetchStudents} 
                        className="order-1 sm:order-2 px-8 md:px-12 py-4 md:py-5 bg-blue-700 text-white rounded-[20px] font-black uppercase text-[11px] tracking-[2px] shadow-2xl hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-3 w-full sm:w-auto"
                    >
                        Search Registry <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* --- RESULTS AREA: Defined Structure with Skeleton --- */}
            <div className="bg-white rounded-[35px] md:rounded-[45px] shadow-2xl border-2 border-white overflow-hidden min-h-[450px] transition-all">
                <div className="overflow-x-auto no-scrollbar">
                    {loading ? (
                        <div className="p-8">
                            <TableSkeleton />
                        </div>
                    ) : students.length > 0 ? (
                        <table className="w-full border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-900 text-[10px] md:text-[11px] font-black uppercase text-white tracking-[3px]">
                                    <th className="px-8 py-7 border-r border-white/5 text-center w-40">Roll ID</th>
                                    <th className="px-8 py-7 text-left">Student Credentials</th>
                                    <th className="px-8 py-7 text-center">Academic Unit</th>
                                    <th className="px-8 py-7 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-50">
                                {students.map((student, index) => (
                                    <tr
                                        key={student.id}
                                        onClick={() => setSelectedStudent(student)}
                                        className={`group transition-all cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/80`}
                                    >
                                        <td className="px-8 py-6 text-[12px] font-black text-slate-900 border-r border-slate-100 text-center">
                                            <span className="bg-slate-100 px-3 py-1 rounded-lg">#{student.roll_number || '---'}</span>
                                        </td>

                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white shadow-xl flex items-center justify-center font-black text-sm border-2 border-white group-hover:scale-110 transition-transform shrink-0">
                                                    {student.avatar_url ? (
                                                        <img src={student.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                                                    ) : student.full_name?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 text-sm uppercase leading-tight tracking-tight truncate">{student.full_name}</p>
                                                    <p className="text-[9px] font-bold text-blue-600 uppercase mt-1 tracking-wider">
                                                        {student.gender} • {student.father_mobile || student.phone || 'No Contact'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-[11px] font-black text-slate-900 uppercase">Grade {student.current_class || 'N/A'}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 rounded-md mt-1">Section {student.current_section || 'A'}</span>
                                            </div>
                                        </td>

                                        <td className="px-8 py-6 text-center">
                                            <div className="flex justify-center">
                                                <div className="px-5 py-2.5 bg-slate-900 text-white rounded-xl group-hover:bg-blue-700 transition-all shadow-xl flex items-center gap-2 border-b-2 border-black group-hover:border-blue-800">
                                                    <Eye size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        /* Empty State */
                        <div className="h-[450px] flex flex-col items-center justify-center text-slate-400 p-10 text-center space-y-6">
                            <div className="p-8 bg-blue-50 rounded-[40px] border-4 border-white shadow-2xl animate-bounce">
                                <GraduationCap size={64} strokeWidth={1} className="text-blue-300" />
                            </div>
                            <div className="max-w-xs space-y-2">
                                <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">Registry Offline</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[3px] leading-loose">
                                    Apply filters above to synchronize with the central student database.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL --- */}
            <AnimatePresence mode="wait">
                {selectedStudent && (
                    <StudentProfileModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}

const SearchInput = ({ icon, placeholder, value, onChange }: any) => (
    <div className="relative group flex-1">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-all z-10">
            {icon}
        </div>
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-14 pr-6 py-4 md:py-5 bg-slate-50 border-2 border-transparent rounded-[22px] text-sm font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
        />
    </div>
);