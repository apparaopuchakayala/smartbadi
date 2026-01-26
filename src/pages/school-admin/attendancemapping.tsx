import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, User, BookOpen, Save, RotateCcw,
    Plus, X, ChevronDown, Filter, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { smartBadiApi } from '../../services/smartBadiApi';
import toast from 'react-hot-toast';
// Import skeletons
import { ControlSkeleton, TableSkeleton } from '../../components/common/skeletoncomp';

export function AttenadnceMapping({ schoolId }: { schoolId: string }) {
    const [filters, setFilters] = useState({ className: '', section: '', fromDate: '', toDate: '' });
    const [showTimetable, setShowTimetable] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [
        { start: '09:00 AM', end: '10:00 AM' },
        { start: '10:00 AM', end: '11:00 AM' },
        { start: '11:15 AM', end: '12:15 PM' },
        { start: '12:15 PM', end: '01:15 PM' },
        { start: '02:00 PM', end: '03:00 PM' },
        { start: '03:00 PM', end: '04:00 PM' },
    ];

    useEffect(() => {
        const loadMasterData = async () => {
            if (!schoolId) return;
            setLoading(true);
            try {
                const staff = await smartBadiApi.getProfiles(schoolId, 'teacher');
                setTeachers(staff);
                setSubjects(smartBadiApi.getTelanganaSubjects());
            } catch (err: any) {
                console.error("Error loading master data:", err.message);
            } finally {
                setLoading(false);
            }
        };
        loadMasterData();
    }, [schoolId]);

    return (
        <div className="space-y-6 md:space-y-10 text-left min-h-screen pb-20 font-poppins bg-[#F8FAFC]">
            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                        Schedule <span className="text-blue-700">Mapping</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-[10px] md:text-[12px] tracking-[2px] md:tracking-[3px] uppercase mt-2 ml-1">Academic slot configuration</p>
                </div>
            </div>

            {/* 2. SELECTION BOX */}
            {loading ? <ControlSkeleton /> : (
                <div className="bg-white p-6 md:p-10 rounded-[35px] md:rounded-[40px] shadow-lg border-2 border-blue-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 hidden lg:block">
                        <LayoutGrid size={120} />
                    </div>

                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 md:gap-6 items-end">
                        <div className="lg:col-span-3 space-y-2">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[2px] ml-1">Grade Level</label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-slate-100 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all appearance-none font-black text-slate-800 text-sm"
                                    value={filters.className}
                                    onChange={(e) => setFilters({ ...filters, className: e.target.value })}
                                >
                                    <option value="">Select Class</option>
                                    {[...Array(10)].map((_, i) => <option key={i} value={`${i + 1}`}>{i + 1}th Class</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[2px] ml-1">Section</label>
                            <div className="relative">
                                <select
                                    className="w-full p-4 bg-slate-100 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-600 transition-all appearance-none font-black text-slate-800 text-sm"
                                    value={filters.section}
                                    onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                                >
                                    <option value="">Select Section</option>
                                    {['A', 'B', 'C'].map(s => <option key={s} value={s}>Section {s}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        <div className="lg:col-span-4 space-y-2">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[2px] ml-1">Validity Range</label>
                            <div className="flex items-center gap-2 bg-slate-100 border-2 border-transparent rounded-2xl p-2 h-[58px] focus-within:border-blue-600 focus-within:bg-white transition-all">
                                <input
                                    type="date"
                                    className="w-full bg-transparent px-2 text-[11px] font-black outline-none text-slate-800 cursor-pointer"
                                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                />
                                <div className="w-[2px] h-4 bg-slate-300 shrink-0"></div>
                                <input
                                    type="date"
                                    className="w-full bg-transparent px-2 text-[11px] font-black outline-none text-slate-800 cursor-pointer"
                                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="lg:col-span-3 flex gap-3">
                            <button
                                onClick={() => {
                                    if (!filters.className || !filters.section) return toast.error("Please select Class and Section");
                                    setShowTimetable(true);
                                }}
                                className="flex-1 bg-slate-900 text-white h-[58px] rounded-2xl font-black uppercase text-[10px] tracking-[2px] hover:bg-blue-700 transition-all shadow-xl flex items-center justify-center gap-2 px-4"
                            >
                                <Filter size={16} /> Load Grid
                            </button>
                            <button
                                onClick={() => {
                                    setFilters({ className: '', section: '', fromDate: '', toDate: '' });
                                    setShowTimetable(false);
                                }}
                                className="h-[58px] w-[58px] bg-red-50 text-red-500 border-2 border-red-100 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                            >
                                <RotateCcw size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. TIMETABLE GRID */}
            <AnimatePresence>
                {showTimetable && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[40px] border-2 border-slate-100 shadow-2xl overflow-hidden"
                    >
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-900">
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[3px] border-r border-slate-800 w-32 text-center">Interval</th>
                                        {days.map(day => (
                                            <th key={day} className="p-6 text-[10px] font-black text-white uppercase tracking-[3px] text-center">{day}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeSlots.map((slot, idx) => (
                                        <tr key={idx} className="border-b-2 border-slate-50 last:border-0 group">
                                            <td className="p-6 bg-slate-50/80 border-r-2 border-slate-100 text-center">
                                                <div className="text-[12px] font-black text-slate-900">{slot.start}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{slot.end}</div>
                                            </td>
                                            {days.map(day => (
                                                <td key={day} className="p-3 border-r-2 border-slate-50 min-w-[160px]">
                                                    <button
                                                        onClick={() => setSelectedSlot({ day, ...slot })}
                                                        className="w-full min-h-[110px] p-4 rounded-[28px] border-2 border-dashed border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group"
                                                    >
                                                        <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-700 group-hover:text-white group-hover:rotate-90 transition-all duration-300">
                                                            <Plus size={18} />
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-400 group-hover:text-blue-700 uppercase tracking-widest">Assign Slot</span>
                                                    </button>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. ASSIGNMENT MODAL (Responsive) */}
            <AnimatePresence>
                {selectedSlot && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSlot(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[45px] p-8 md:p-12 shadow-2xl border-4 border-white">
                            <div className="flex justify-between items-start mb-8">
                                <div className="text-left">
                                    <div className="flex items-center gap-2 text-blue-700 mb-2 font-black uppercase text-[10px] tracking-widest">
                                        <Clock size={16} /> {selectedSlot.start} - {selectedSlot.end}
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">{selectedSlot.day} <span className="text-blue-700">Allocation</span></h3>
                                </div>
                                <button onClick={() => setSelectedSlot(null)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><X size={20} /></button>
                            </div>

                            <form className="space-y-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-[2px] ml-1">Primary Faculty</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                        <select className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-600 font-black text-slate-800 transition-all appearance-none text-sm shadow-inner">
                                            <option>Select Teacher</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-[2px] ml-1">Academic Subject</label>
                                    <div className="relative group">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                        <select className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-600 font-black text-slate-800 transition-all appearance-none text-sm shadow-inner">
                                            <option>Select Subject</option>
                                            {subjects.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                    <button type="button" className="flex-1 py-5 bg-blue-700 text-white rounded-[22px] font-black uppercase text-[11px] tracking-[3px] shadow-2xl hover:bg-slate-900 active:scale-95 transition-all">
                                        Save Allocation
                                    </button>
                                    <button type="button" onClick={() => setSelectedSlot(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[22px] font-black uppercase text-[11px] tracking-[3px] hover:bg-red-50 hover:text-red-500 transition-all border-2 border-transparent">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}