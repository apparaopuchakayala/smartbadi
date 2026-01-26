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
        <div className="bg-white p-6 md:p-8 rounded-[45px] border border-slate-100 shadow-md text-left w-full">
            {/* Header - Made more compact */}
            <div className="flex items-center gap-4 mb-6">
                <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200">
                    <Settings size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                        Attendance <span className="text-[#8DC63F]">Configuration</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Control how teachers record attendance
                    </p>
                </div>
            </div>

            {/* Grid Container */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModeCard
                    active={mode === 'daily'}
                    icon={<CalendarDays size={20} />}
                    title="Daily Mode"
                    desc="Once per day (Morning)."
                    onClick={() => updateMode('daily')}
                />
                <ModeCard
                    active={mode === 'twice'}
                    icon={<Clock size={20} />}
                    title="Twice Daily"
                    desc="Morning and Afternoon."
                    onClick={() => updateMode('twice')}
                />
                <ModeCard
                    active={mode === 'subject_wise'}
                    icon={<BookMarked size={20} />}
                    title="Subject Wise"
                    desc="Every period by teacher."
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
            // CHANGED: flex-row instead of flex-col to place icon next to text
            className={`p-4 rounded-[30px] border-2 transition-all text-left flex flex-row items-center gap-4 h-full ${
                active 
                ? 'border-blue-600 bg-blue-50/30' 
                : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'
            }`}
        >
            {/* Icon Container */}
            <div className={`shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                {icon}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-slate-800 text-[11px] md:text-xs uppercase truncate">
                        {title}
                    </h4>
                    {active && (
                        <CheckCircle2 size={14} className="text-blue-600 shrink-0" />
                    )}
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-tight line-clamp-2">
                    {desc}
                </p>
            </div>
        </button>
    );
}