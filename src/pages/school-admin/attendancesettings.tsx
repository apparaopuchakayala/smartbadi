import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Settings, CheckCircle2, Clock, CalendarDays, BookMarked } from 'lucide-react';
import toast from 'react-hot-toast';
import { CardSkeleton } from '../../components/common/skeletoncomp';
import { useAuth } from '../../context/AuthProvider';

export function AttendanceSettings() {
    const [mode, setMode] = useState('daily');
    const [loading, setLoading] = useState(true);
    const { profile } = useAuth();

    const schoolId = profile?.school_id;

    // --- EFFECT: PULL DATA FROM DB ON LOAD ---
    useEffect(() => {
        const fetchCurrentMode = async () => {
            if (!schoolId) {
                console.log("Waiting for schoolId context...");
                return;
            }

            setLoading(true);
            try {
                // Fetch the current attendance mode for the specific school
                const { data, error } = await supabase
                    .from('schools')
                    .select('attendance_mode')
                    .eq('id', schoolId)
                    .single();
                
                if (error) throw error;

                if (data?.attendance_mode) {
                    setMode(data.attendance_mode);
                }
            } catch (err: any) {
                console.error("Error fetching institutional mode:", err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentMode();
    }, [schoolId]);

    // --- FUNCTION: PUSH DATA TO DB ON CLICK ---
    const updateMode = async (newMode: string) => {
        if (loading || !schoolId) return;
        const loadingToast = toast.loading("Updated Attendance Mode...");
        try {
            // Push the update to the schools table
            const { error } = await supabase
                .from('schools')
                .update({ attendance_mode: newMode })
                .eq('id', schoolId);

            if (error) throw error;

            // Only update local UI state if database update was successful
            setMode(newMode);
            toast.success(`Institutional protocol updated to ${newMode.replace('_', ' ')}`, { id: loadingToast });
        } catch (err: any) {
            console.error("Update error:", err.message);
            toast.error("Failed to sync protocol settings", { id: loadingToast });
        }
    };

    return (
        <div className="bg-white p-5 md:p-8 rounded-[35px] md:rounded-[45px] border-2 border-slate-100 shadow-xl text-left w-full transition-all">
            
            {/* --- HEADER --- */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg border-2 border-white shrink-0">
                    <Settings size={22} />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                        Attendance <span className="text-blue-700">Protocol</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mt-1.5">
                        Define academic tracking method for this institution
                    </p>
                </div>
            </div>

            {/* --- PROTOCOL GRID: Responsive Horizontal Scroll on Mobile --- */}
            <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-4 md:pb-0 no-scrollbar">
                {loading ? (
                    // Show 3 skeletons to match the 3 mode options while fetching
                    [1, 2, 3].map(i => (
                        <div key={i} className="min-w-[280px] md:min-w-0 flex-1">
                            <CardSkeleton />
                        </div>
                    ))
                ) : (
                    <>
                        <ModeCard
                            active={mode === 'daily'}
                            icon={<CalendarDays size={22} />}
                            title="Daily Mode"
                            desc="Standard single check-in (Morning Session)."
                            onClick={() => updateMode('daily')}
                        />
                        <ModeCard
                            active={mode === 'twice'}
                            icon={<Clock size={22} />}
                            title="Twice Daily"
                            desc="Two-point verification (AM and PM Sessions)."
                            onClick={() => updateMode('twice')}
                        />
                        <ModeCard
                            active={mode === 'subject_wise'}
                            icon={<BookMarked size={22} />}
                            title="Subject Wise"
                            desc="Granular tracking recorded for every period."
                            onClick={() => updateMode('subject_wise')}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

// --- SUB-COMPONENT: MODE CARD (Responsive Optimized) ---
function ModeCard({ active, icon, title, desc, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-5 md:p-6 rounded-[30px] border-4 transition-all text-left flex flex-row items-center gap-5 h-full min-w-[280px] md:min-w-0 flex-1 relative overflow-hidden group ${
                active 
                ? 'border-blue-600 bg-white shadow-2xl shadow-blue-100 scale-[1.02]' 
                : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
            }`}
        >
            {/* Background Visual Accent */}
            {active && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/5 rounded-bl-[40px] -mr-4 -mt-4 transition-transform group-hover:scale-110" />}

            {/* Icon Container */}
            <div className={`p-3 rounded-2xl shrink-0 transition-colors ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-100'}`}>
                {icon}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center justify-between gap-2">
                    <h4 className={`font-black uppercase tracking-tight text-xs md:text-sm truncate ${active ? 'text-slate-900' : 'text-slate-600'}`}>
                        {title}
                    </h4>
                    {active && (
                        <div className="bg-blue-600 rounded-full p-0.5 shrink-0">
                            <CheckCircle2 size={12} className="text-white" />
                        </div>
                    )}
                </div>
                <p className={`text-[10px] md:text-[11px] font-bold mt-1 leading-snug line-clamp-2 uppercase tracking-tight ${active ? 'text-blue-700/70' : 'text-slate-400'}`}>
                    {desc}
                </p>
            </div>
        </button>
    );
}