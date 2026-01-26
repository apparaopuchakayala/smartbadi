import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    CheckCircle2, Clock, AlertCircle, Search,
    Filter, Send, BookOpen, ChevronRight, Loader2,
    ShieldCheck, Zap, Activity, BarChart3, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
// Import skeletons
import { TableSkeleton, ControlSkeleton } from '../../components/common/skeletoncomp';

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
        <div className="bg-white rounded-[30px] md:rounded-[45px] p-4 md:p-6 shadow-sm border border-slate-200 space-y-6">
            
            {/* --- HEADER --- */}
            <div className="flex items-center gap-4 mb-4 md:mb-8">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200 shrink-0">
                    <Settings size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                        Marks <span className="text-[#8DC63F]">Inventory</span>
                    </h1>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Submission Status</p>
                </div>
            </div>

            {/* --- STATS GRID: Responsive Columns --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatBox 
                    icon={<BarChart3 size={18} />} 
                    title="Total" 
                    value={loading ? "..." : report.length} 
                    color="blue" 
                />
                <StatBox 
                    icon={<CheckCircle2 size={18} />} 
                    title="Done" 
                    value={loading ? "..." : report.filter(r => r.status === 'COMPLETED').length} 
                    color="green" 
                />
                <StatBox 
                    icon={<Clock size={18} />} 
                    title="Pending" 
                    value={loading ? "..." : report.filter(r => r.status !== 'COMPLETED').length} 
                    color="orange" 
                />
                <div className="bg-slate-900 p-4 md:p-6 rounded-[25px] md:rounded-[35px] shadow-xl flex items-center gap-3 md:gap-4 text-white">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl flex items-center justify-center text-[#8DC63F] shrink-0">
                        <Zap size={18} fill="currentColor" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[8px] md:text-[10px] font-black opacity-60 uppercase tracking-widest">Ratio</p>
                        <p className="text-lg md:text-xl font-black truncate">
                            {loading ? "0%" : (Math.round((report.filter(r => r.status === 'COMPLETED').length / report.length) * 100) || 0) + "%"}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- SEARCH & FILTERS: Stack on Mobile --- */}
            {loading ? <ControlSkeleton /> : (
                <div className="bg-white rounded-[25px] md:rounded-[40px] p-3 md:p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-80 lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-bold outline-none border-none focus:ring-2 ring-blue-500/10 transition-all"
                        />
                    </div>
                    <div className="flex bg-slate-50 p-1 rounded-[18px] md:rounded-[22px] w-full md:w-auto overflow-x-auto no-scrollbar">
                        {['ALL', 'PENDING', 'COMPLETED'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-[14px] md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* --- REGISTRY TABLE --- */}
            <div className="bg-white rounded-[30px] md:rounded-[45px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto h-[400px] custom-scrollbar">
                    {loading ? (
                        <TableSkeleton />
                    ) : (
                        <table className="w-full text-center border-collapse min-w-[600px]">
                            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100">
                                <tr className="text-[10px] font-black uppercase text-slate-400">
                                    <th className="px-4 md:px-8 py-5 md:py-6 text-center">Class</th>
                                    <th className="px-4 md:px-8 py-5 md:py-6 text-center">Subject</th>
                                    <th className="px-4 md:px-8 py-5 md:py-6 text-center">Status</th>
                                    <th className="px-4 md:px-8 py-5 md:py-6 text-center">Nudge</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredData.length > 0 ? (
                                    filteredData.map((item) => (
                                        <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-black text-slate-500 text-[9px] uppercase whitespace-nowrap">
                                                    {item.className}-{item.section}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="flex items-center justify-center gap-2 md:gap-3">
                                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                                        <BookOpen size={14} />
                                                    </div>
                                                    <div className="text-left min-w-0">
                                                        <p className="font-black text-slate-700 text-[11px] md:text-xs uppercase truncate max-w-[120px] md:max-w-none">{item.subject}</p>
                                                        <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase truncate">{item.examName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="flex justify-center">
                                                    {item.status === 'COMPLETED' ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[8px] md:text-[9px] font-black uppercase border border-green-100 whitespace-nowrap">
                                                            <ShieldCheck size={10} /> Verified
                                                        </div>
                                                    ) : (
                                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase border whitespace-nowrap ${item.status === 'PENDING' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                            <Activity size={10} className="animate-pulse" /> {item.status === 'PENDING' ? 'Draft' : 'Pending'}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 md:px-8 py-4 md:py-6">
                                                <div className="flex justify-center">
                                                    {item.status !== 'COMPLETED' ? (
                                                        <button
                                                            onClick={() => toast.success(`Nudge sent to faculty`)}
                                                            className="p-2 md:px-4 md:py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
                                                        >
                                                            <Send size={10} /> <span className="hidden sm:inline">Remind</span>
                                                        </button>
                                                    ) : (
                                                        <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                                                            <CheckCircle2 size={14} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <Search size={32} className="mx-auto text-slate-200 mb-2" />
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No matching records</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- RESPONSIVE MINI STAT BOX COMPONENT ---
const StatBox = ({ icon, title, value, color }: { icon: any, title: string, value: any, color: 'blue' | 'green' | 'orange' }) => {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        orange: "bg-orange-50 text-orange-600"
    };
    return (
        <div className="bg-white p-4 md:p-6 rounded-[25px] md:rounded-[35px] shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 min-w-0">
            <div className={`w-10 h-10 md:w-12 md:h-12 ${colors[color]} rounded-xl flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{title}</p>
                <p className="text-lg md:text-xl font-black text-slate-800 truncate">{value}</p>
            </div>
        </div>
    );
};