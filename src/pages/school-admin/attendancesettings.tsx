    import React, { useState, useEffect } from 'react';
    import { supabase } from '../../services/supabaseClient';
    import { Settings, CheckCircle2, Clock, CalendarDays, BookMarked } from 'lucide-react';
    import toast from 'react-hot-toast';

    export function AttendanceSettings({ schoolId }: { schoolId: string }) {
        const [mode, setMode] = useState('daily');
        const [loading, setLoading] = useState(false);

        const updateMode = async (newMode: string) => {
            setLoading(true);
            const { error } = await supabase
                .from('schools')
                .update({ attendance_mode: newMode })
                .eq('id', schoolId);

            if (!error) {
                setMode(newMode);
                toast.success(`Attendance mode set to ${newMode.replace('_', ' ')}`);
            }
            setLoading(false);
        };

        return (
            <div className="bg-white p-8 md:p-10 rounded-[45px] border border-slate-100 shadow-md text-left w-full">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200"><Settings size={24} /></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                            Attendance <span className="text-[#8DC63F]">Configuration</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Control how teachers record presence</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ModeCard
                        active={mode === 'daily'}
                        icon={<CalendarDays size={24} />}
                        title="Daily Mode"
                        desc="Once per day (Morning). Usually by Class Teacher."
                        onClick={() => updateMode('daily')}
                    />
                    <ModeCard
                        active={mode === 'twice'}
                        icon={<Clock size={24} />}
                        title="Twice Daily"
                        desc="Morning and Afternoon sessions separately."
                        onClick={() => updateMode('twice')}
                    />
                    <ModeCard
                        active={mode === 'subject_wise'}
                        icon={<BookMarked size={24} />}
                        title="Subject Wise"
                        desc="Every period by the respective subject teacher."
                        onClick={() => updateMode('subject_wise')}
                    />
                </div>
            </div>
        );
    }

    function ModeCard({ active, icon, title, desc, onClick }: any) {
        return (
            <button
                onClick={onClick}
                className={`p-6 rounded-[35px] border-2 transition-all text-left flex flex-col gap-4 ${active ? 'border-blue-600 bg-blue-50/30' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'
                    }`}
            >
                <div className={`${active ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</div>
                <div>
                    <h4 className="font-black text-slate-800 text-sm uppercase">{title}</h4>
                    <p className="text-[11px] font-medium text-slate-400 mt-1 leading-relaxed">{desc}</p>
                </div>
                {active && <div className="mt-auto flex items-center gap-2 text-blue-600 font-black text-[9px] uppercase tracking-widest">
                    <CheckCircle2 size={14} /> Active Control
                </div>}
            </button>
        );
    }