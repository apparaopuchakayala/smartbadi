import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
    Cake, Gift, Send, User, Sparkles, PartyPopper
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function BirthdayGreetings() {
    const [loading, setLoading] = useState(true);
    const [birthdays, setBirthdays] = useState<any[]>([]);

    useEffect(() => {
        fetchTodaysBirthdays();
    }, []);

    const fetchTodaysBirthdays = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const month = today.getMonth() + 1;
            const day = today.getDate();

            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, current_class, dob, avatar_url, role, subject_teaching')
                .in('role', ['teacher', 'student'])
                .not('dob', 'is', null);

            const todaysList = data?.filter(s => {
                const bDate = new Date(s.dob);
                return (bDate.getMonth() + 1 === month) && (bDate.getDate() === day);
            }) || [];

            setBirthdays(todaysList);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[35px] md:rounded-[45px] p-5 md:p-6  flex flex-col h-[400px] w-full transition-all">
            {/* --- COMPACT HEADER --- */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 shrink-0">
                        <Cake size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Birthdays</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Today's Stars</p>
                    </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                    <PartyPopper size={16} className="text-slate-400" />
                </div>
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        /* --- BIRTHDAY SKELETON LIST --- */
                        [1, 2, 3].map((i) => (
                            <div key={i} className="bg-slate-50 rounded-3xl p-4 animate-pulse flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-200 shrink-0" />
                                    <div className="space-y-2">
                                        <div className="h-3 w-24 bg-slate-200 rounded" />
                                        <div className="h-2 w-16 bg-slate-100 rounded" />
                                    </div>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-slate-100" />
                            </div>
                        ))
                    ) : birthdays.length > 0 ? (
                        birthdays.map((student) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ scale: 1.02 }}
                                className="relative bg-slate-50 rounded-3xl p-4 border border-transparent hover:border-amber-200 hover:bg-amber-50/30 transition-all group text-left"
                            >
                                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Sparkles size={40} className="absolute -top-2 -right-2 text-amber-300 animate-pulse" />
                                </div>

                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-300 shadow-sm border border-slate-100 overflow-hidden shrink-0">
                                            {student.avatar_url ? (
                                                <img src={student.avatar_url} className="w-full h-full object-cover" alt="" />
                                            ) : <User size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-900 text-[11px] uppercase truncate">{student.full_name}</p>
                                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tight"> {student.role}</p>
                                            {student.role === 'teacher' && (
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tight mt-0.5 truncate"> {student.subject_teaching}</p>
                                            )}
                                        </div>
                                    </div>

                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => toast.success(`Birthday wish sent to ${student.full_name}!`)}
                                        className="w-9 h-9 bg-white text-amber-500 rounded-xl flex items-center justify-center shadow-sm border border-amber-100 hover:bg-amber-500 hover:text-white transition-all shrink-0 ml-2"
                                    >
                                        <Send size={14} />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                            <Gift size={40} strokeWidth={1.5} className="text-slate-300" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">No Birthdays Today</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- FOOTER --- */}
            <div className="mt-4 pt-4 border-t border-slate-50">
                <button className="w-full py-3 bg-slate-50 text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                    View Monthly Registry
                </button>
            </div>
        </div>
    );
}