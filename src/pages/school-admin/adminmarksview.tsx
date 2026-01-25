import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    CheckCircle2, Clock, AlertCircle, Search,
    Filter, Send, BookOpen, ChevronRight, Loader2,
    ShieldCheck, Zap, Activity, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export function AdminMarksView() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

    useEffect(() => {
        if (profile?.school_id) fetchDetailedStatus();
    }, [profile]);

    const fetchDetailedStatus = async () => {
        setLoading(true);
        try {
            const { data: configs } = await supabase
                .from('exam_configurations')
                .select(`
                    id, current_class, current_section,
                    exams ( exam_name ),
                    class_subjects ( subject_name )
                `)
                .eq('school_id', profile?.school_id);

            const { data: uploadCounts } = await supabase
                .from('student_marks')
                .select('exam_config_id, is_uploaded')
                .eq('school_id', profile?.school_id);

            const finalReport = configs?.map(config => {
                const marksForThisExam = uploadCounts?.filter(m => m.exam_config_id === config.id) || [];
                const isComplete = marksForThisExam.length > 0 && marksForThisExam.every(m => m.is_uploaded);
                const isStarted = marksForThisExam.length > 0;

                return {
                    id: config.id,
                    className: config.current_class,
                    section: config.current_section,
                    subject: config.class_subjects?.subject_name,
                    examName: config.exams?.exam_name,
                    status: isComplete ? 'COMPLETED' : (isStarted ? 'PENDING' : 'NOT_STARTED'),
                };
            });

            setReport(finalReport || []);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = report.filter(item => {
        const matchesSearch = item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.className?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'ALL' ? true :
            filter === 'PENDING' ? item.status !== 'COMPLETED' :
                item.status === 'COMPLETED';
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6">
            {/* --- ANALYTICS RADAR --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><BarChart3 size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Subjects</p>
                        <p className="text-xl font-black text-slate-800">{report.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center"><CheckCircle2 size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</p>
                        <p className="text-xl font-black text-slate-800">{report.filter(r => r.status === 'COMPLETED').length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center"><Clock size={20} /></div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Upload</p>
                        <p className="text-xl font-black text-slate-800">{report.filter(r => r.status !== 'COMPLETED').length}<span className="text-sm font-black text-slate-800 uppercase"> subjects</span></p>
                    </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[35px] shadow-xl flex items-center gap-4 text-white">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#8DC63F]"><Zap size={20} fill="currentColor" /></div>
                    <div>
                        <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Compliance</p>
                        <p className="text-xl font-black">{Math.round((report.filter(r => r.status === 'COMPLETED').length / report.length) * 100) || 0}%</p>
                    </div>
                </div>
            </div>

            {/* --- SEARCH & FILTERS --- */}
            <div className="bg-white rounded-[40px] p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                        placeholder="Search by subject or class..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-none focus:ring-2 ring-blue-500/10 transition-all"
                    />
                </div>
                <div className="flex bg-slate-50 p-1.5 rounded-[22px] w-full md:w-auto">
                    {['ALL', 'PENDING', 'COMPLETED'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- REGISTRY TABLE --- */}
            <div className="bg-white rounded-[45px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                {/* SCROLLABLE CONTAINER: Fixed height for ~4-5 entries */}
                <div className="overflow-y-auto h-[300px] custom-scrollbar">
                    <table className="w-full text-center border-collapse">
                        {/* Sticky Header stays at the top while scrolling */}
                        <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100">
                            <tr className="text-[10px] font-black uppercase text-slate-400">
                                <th className="px-8 py-6 text-center">Class</th>
                                <th className="px-8 py-6 text-center">Subject</th>
                                <th className="px-8 py-6 text-center">Status</th>
                                <th className="px-8 py-6 text-center">Follow Up</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={4} className="py-20"><Loader2 className="animate-spin mx-auto text-blue-600" /></td></tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                                        {/* Class - Centered */}
                                        <td className="px-8 py-6 text-center">
                                            <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-black text-slate-500 text-[9px] uppercase">
                                                {item.className} • {item.section}
                                            </span>
                                        </td>

                                        {/* Subject - Content Centered */}
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                                    <BookOpen size={14} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-slate-700 text-xs uppercase tracking-tight leading-none">{item.subject}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.examName}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status - Badge Centered */}
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                {item.status === 'COMPLETED' ? (
                                                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase border border-green-100">
                                                        <ShieldCheck size={12} /> Verified
                                                    </div>
                                                ) : (
                                                    <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${item.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                        <Activity size={12} className="animate-pulse" /> {item.status === 'PENDING' ? 'Draft Saved' : 'Not Uploaded'}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Follow Up - Centered */}
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex justify-center">
                                                {item.status !== 'COMPLETED' ? (
                                                    <button
                                                        onClick={() => toast.success(`Nudge sent to ${item.subject} faculty`)}
                                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-100"
                                                    >
                                                        <Send size={12} /> Send Remainder
                                                    </button>
                                                ) : (
                                                    <div className="w-9 h-9 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                                                        <CheckCircle2 size={16} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center space-y-3">
                                        <Search size={40} className="mx-auto text-slate-200" />
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[4px]">No matching records found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}