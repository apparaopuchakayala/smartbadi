import React, { useState } from 'react';
import {
    Search, User, Hash, Phone, Mail,
    RotateCcw, ChevronRight, ShieldCheck, Download,
    Eye, Loader2
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentProfileModal } from './studentprofilemodal';
import toast from 'react-hot-toast';

export function StudentList() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState({ name: '', rollNo: '', contact: '', email: '' });

    const fetchStudents = async () => {
        if (!searchQuery.name && !searchQuery.rollNo && !searchQuery.contact) {
            return toast.error("Please enter search criteria");
        }
        setLoading(true);
        try {
            let query = supabase.from('profiles').select('*').eq('role', 'student');
            if (profile?.role !== 'super-admin') query = query.eq('school_id', profile.school_id);
            if (searchQuery.name) query = query.ilike('full_name', `%${searchQuery.name}%`);
            if (searchQuery.rollNo) query = query.ilike('roll_number', `%${searchQuery.rollNo}%`);

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
        <div className="space-y-6 p-3 md:p-8 bg-[#F1F5F9] min-h-screen pb-20 font-poppins relative overflow-x-hidden text-left">

            {/* --- SEARCH HUB: High Contrast --- */}
            <div className="bg-white p-6 md:p-10 rounded-[35px] shadow-lg border-2 border-blue-100 flex flex-col gap-6 md:gap-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white shrink-0">
                            <Search size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                                Student <span className="text-[#8DC63F]">Serach</span>
                            </h1>
                            <p className="text-slate-500 text-[10px] md:text-[12px] font-black uppercase tracking-[2px] mt-2 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-[#8DC63F]" /> Secure for student info
                            </p>
                        </div>
                    </div>
                    <button className="hidden sm:flex p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-blue-600 hover:text-white border-2 border-slate-200 transition-all shadow-sm">
                        <Download size={22} />
                    </button>
                </div>

                {/* SEARCH INPUT GRID: Darker borders and text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t-2 border-slate-100">
                    <SearchInput icon={<User size={18} />} placeholder="Student Name" value={searchQuery.name} onChange={(v: string) => setSearchQuery({ ...searchQuery, name: v })} />
                    <SearchInput icon={<Hash size={18} />} placeholder="Roll ID" value={searchQuery.rollNo} onChange={(v: string) => setSearchQuery({ ...searchQuery, rollNo: v })} />
                    <SearchInput icon={<Phone size={18} />} placeholder="Phone Number" value={searchQuery.contact} onChange={(v: string) => setSearchQuery({ ...searchQuery, contact: v })} />
                    <SearchInput icon={<Mail size={18} />} placeholder="Email Address" value={searchQuery.email} onChange={(v: string) => setSearchQuery({ ...searchQuery, email: v })} />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4">
                    <button onClick={() => { setStudents([]); setSearchQuery({ name: '', rollNo: '', contact: '', email: '' }); }} className="order-2 sm:order-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-600 py-3 transition-colors px-6">
                        <RotateCcw size={16} /> Reset Filters
                    </button>
                    <button onClick={fetchStudents} className="order-1 sm:order-2 px-8 md:px-12 py-5 bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-[2px] shadow-xl hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-3 w-full sm:w-auto">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <>Search <ChevronRight size={18} /></>}
                    </button>
                </div>
            </div>

            {/* --- RESULTS TABLE: Defined Structure --- */}
            <div className="bg-white rounded-[35px] shadow-2xl border-2 border-slate-200 overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    {students.length > 0 ? (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-[11px] font-black uppercase text-white tracking-[2px]">
                                    <th className="px-6 py-7 border-r border-slate-800 hidden sm:table-cell text-center">Roll Number</th>
                                    <th className="px-6 py-7 text-center">Student Information</th>
                                    <th className="px-6 py-7 hidden md:table-cell text-center">Class & Section</th>
                                    <th className="px-6 py-7 text-center">Profile View</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-100">
                                {students.map((student, index) => (
                                    <tr
                                        key={student.id}
                                        onClick={() => setSelectedStudent(student)}
                                        className={`group transition-all cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50/80`}
                                    >
                                        {/* Roll Number Column */}
                                        <td className="px-6 py-6 text-[12px] font-black text-slate-900 border-r border-slate-100 hidden sm:table-cell text-center">
                                            #{student.roll_number || '---'}
                                        </td>

                                        {/* Student Info Column - Centered internal flex */}
                                        <td className="px-6 py-6">
                                            <div className="flex items-center justify-center gap-4 text-left">
                                                {/* justify-center centers the block, text-left keeps the name/gender alignment clean */}
                                                <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white shadow-lg flex items-center justify-center font-black text-sm border-2 border-white group-hover:scale-110 transition-transform shrink-0">
                                                    {student.full_name?.charAt(0)}
                                                </div>
                                                <div className="min-w-[140px]">
                                                    <p className="font-black text-slate-900 text-sm md:text-md uppercase leading-tight tracking-tight">{student.full_name}</p>
                                                    <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">
                                                        {student.gender} • {student.phone || 'No Contact'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Class & Section Column */}
                                        <td className="px-6 py-6 font-black text-slate-700 text-xs md:text-sm uppercase hidden md:table-cell text-center">
                                            Grade {student.current_class || 'N/A'} - {student.current_section || 'A'}
                                        </td>

                                        {/* Action Column */}
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex justify-center">
                                                <div className="px-4 py-2 bg-slate-900 text-white rounded-xl group-hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
                                                    <Eye size={16} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">View Data</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 p-10 text-center space-y-4">
                            <div className="p-6 bg-slate-100 rounded-full">
                                <Search size={60} className="text-slate-300" />
                            </div>
                            <div>
                                <p className="text-lg font-black text-slate-900 uppercase tracking-[4px]">No Records Displayed</p>
                                <p className="text-sm font-medium text-slate-500 mt-2">Apply filters above to query the central student database.</p>
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
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-700 transition-all z-10">
            {icon}
        </div>
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-12 pr-4 py-4 md:py-5 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all placeholder:text-slate-400 shadow-sm"
        />
    </div>
);