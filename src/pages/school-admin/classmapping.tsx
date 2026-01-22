import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, User, BookOpen, Save, RotateCcw,
    Plus, X, ChevronDown, Filter, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { smartBadiApi } from '../../services/smartBadiApi';
import toast from 'react-hot-toast';

export function ClassMapping({ schoolId }: { schoolId: string }) {
    const [filters, setFilters] = useState({ className: '', section: '', fromDate: '', toDate: '' });
    const [showTimetable, setShowTimetable] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);

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
            if (!schoolId) {
                console.warn("Waiting for schoolId...");
                return;
            }
            try {
                const staff = await smartBadiApi.getProfiles(schoolId, 'teacher');
                setTeachers(staff);
                setSubjects(smartBadiApi.getTelanganaSubjects());
            } catch (err: any) {
                console.error("Error loading master data:", err.message);
            }
        };

        loadMasterData();
    }, [schoolId]); 

    return (
        <div className="space-y-10 text-left min-h-screen pb-20">
            {/* 1. MINIMALIST HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 tracking-tight uppercase">Class Schedule Mapping</h1>
                    <p className="text-slate-400 font-medium text-[12px] tracking-[3px] uppercase mt-1 ml-1.5">Configure academic time-slots</p>
                </div>
            </div>

            {/* 2. PREMIUM SELECTION BOX */}
            <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <LayoutGrid size={120} />
                </div>

                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 items-end">

                    {/* Grade Level - Takes 3 columns on large screens */}
                    <div className="lg:col-span-3 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Grade Level</label>
                        <div className="relative">
                            <select
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-300 transition-all appearance-none font-bold text-slate-700 text-sm"
                                value={filters.className}
                                onChange={(e) => setFilters({ ...filters, className: e.target.value })}
                            >
                                <option value="">Select Class</option>
                                {[...Array(10)].map((_, i) => <option key={i} value={`${i + 1}`}>{i + 1}th Class</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Section - Takes 2 columns on large screens */}
                    <div className="lg:col-span-2 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Section</label>
                        <div className="relative">
                            <select
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-300 transition-all appearance-none font-bold text-slate-700 text-sm"
                                value={filters.section}
                                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                            >
                                <option value="">Select Section</option>
                                {['A', 'B', 'C'].map(s => <option key={s} value={s}>Section {s}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Validity Range - Takes 4 columns on large screens */}
                    <div className="lg:col-span-4 space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Validity Range</label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-2 h-[58px]">
                            <input
                                type="date"
                                className="w-full bg-transparent px-2 text-[11px] font-bold outline-none text-slate-600 cursor-pointer"
                                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                            />
                            <div className="w-[2px] h-4 bg-slate-200 shrink-0"></div>
                            <input
                                type="date"
                                className="w-full bg-transparent px-2 text-[11px] font-bold outline-none text-slate-600 cursor-pointer"
                                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Buttons - Takes 3 columns on large screens */}
                    <div className="lg:col-span-3 flex gap-3">
                        <button
                            onClick={() => {
                                if (!filters.className || !filters.section) return toast.error("Please select Class and Section");
                                setShowTimetable(true);
                            }}
                            className="flex-1 bg-slate-900 text-white h-[58px] rounded-2xl font-bold uppercase text-[10px] tracking-[2.5px] hover:bg-blue-600 transition-all shadow-xl flex items-center justify-center gap-2 px-4 whitespace-nowrap"
                        >
                            <Filter size={16} /> Load Grid
                        </button>
                        <button
                            onClick={() => {
                                setFilters({ className: '', section: '', fromDate: '', toDate: '' });
                                setShowTimetable(false);
                            }}
                            className="h-[58px] w-[58px] bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shrink-0"
                        >
                            <RotateCcw size={20} />
                        </button>
                    </div>

                </div>
            </div>

            {/* 3. TIMETABLE GRID */}
            <AnimatePresence>
                {showTimetable && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[48px] border border-slate-50 shadow-2xl shadow-slate-200/50 overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-900">
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[3px] border-r border-slate-800 w-32">Interval</th>
                                        {days.map(day => (
                                            <th key={day} className="p-6 text-[10px] font-black text-white uppercase tracking-[3px]">{day}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeSlots.map((slot, idx) => (
                                        <tr key={idx} className="border-b border-slate-50 last:border-0">
                                            <td className="p-6 bg-slate-50/50 border-r border-slate-100 text-center">
                                                <div className="text-[12px] font-black text-slate-700">{slot.start}</div>
                                                <div className="text-[10px] font-bold text-slate-300 uppercase mt-1">{slot.end}</div>
                                            </td>
                                            {days.map(day => (
                                                <td key={day} className="p-3 border-r border-slate-50 min-w-[160px]">
                                                    <button
                                                        onClick={() => setSelectedSlot({ day, ...slot })}
                                                        className="w-full min-h-[100px] p-4 rounded-[24px] border-2 border-dashed border-slate-100 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2 group"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                            <Plus size={16} />
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-300 group-hover:text-blue-600 uppercase tracking-widest">Assign Faculty</span>
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

            {/* 4. ASSIGNMENT MODAL */}
            <AnimatePresence>
                {selectedSlot && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedSlot(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[48px] p-12 shadow-2xl">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                                        <Clock size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{selectedSlot.start} - {selectedSlot.end}</span>
                                    </div>
                                    <h3 className="text-3xl font-light text-slate-800 uppercase tracking-tight">{selectedSlot.day} <span className="font-bold">Slot</span></h3>
                                </div>
                                <button onClick={() => setSelectedSlot(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><X size={20} /></button>
                            </div>

                            <form className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Assigned Teacher</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                        <select className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-400 font-bold text-slate-700 transition-all appearance-none">
                                            <option>Select Faculty</option>
                                            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] ml-1">Subject Curriculum</label>
                                    <div className="relative">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                        <select className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-400 font-bold text-slate-700 transition-all appearance-none">
                                            <option>Choose Subject</option>
                                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[11px] tracking-[3px] shadow-xl hover:bg-blue-600 transition-all">
                                        Confirm Slot
                                    </button>
                                    <button type="button" onClick={() => setSelectedSlot(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-bold uppercase text-[11px] tracking-[3px] hover:bg-slate-100 transition-all">
                                        Discard
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