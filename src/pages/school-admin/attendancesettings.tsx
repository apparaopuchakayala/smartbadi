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
            if (!schoolId) return;

            setLoading(true);
            try {
                // Fetch the current attendance mode for the specific school
                const { data, error } = await supabase
                    .from('schools')
                    .select('attendance_mode')
                    .eq('id', schoolId);

                if (error) throw error;

                // Handle array-based response from Supabase
                if (data && data.length > 0) {
                    setMode(data[0].attendance_mode);
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

        // const { data: { session } } = await supabase.auth.getSession();
        // console.log("JWT DATA:", JSON.parse(atob(session?.access_token.split('.')[1] || "")));

        if (loading || !schoolId) return;

        const loadingToast = toast.loading("Updating Attendance Protocol...");
        try {
            // Push update and use .select() to verify result
            const { data, error } = await supabase
                .from('schools')
                .update({ attendance_mode: newMode })
                .eq('id', schoolId)
                .select();

            if (error) throw error;

            // Confirm that the row was actually found and updated
            if (data && data.length > 0) {
                setMode(data[0].attendance_mode);
                toast.success(`Protocol updated to ${newMode.replace('_', ' ')}`, { id: loadingToast });
            } else {
                throw new Error("No rows matched. Check RLS policies.");
            }
        } catch (err: any) {
            console.error("Update error:", err.message);
            toast.error(err.message || "Failed to sync protocol settings", { id: loadingToast });
        }
    };

    return (
        <div className="bg-white p-5 md:p-8 rounded-[35px] md:rounded-[45px] text-left w-full transition-all">

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

            {/* --- PROTOCOL GRID --- */}
            <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-4 md:pb-0 no-scrollbar">
                {loading ? (
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
                            desc="Take attendance once a day (Morning)."
                            onClick={() => updateMode('daily')}
                        />
                        <ModeCard
                            active={mode === 'twice'}
                            icon={<Clock size={22} />}
                            title="Twice Daily"
                            desc="Take attendance twice daily (Morning - Evening)."
                            onClick={() => updateMode('twice')}
                        />
                        <ModeCard
                            active={mode === 'subject_wise'}
                            icon={<BookMarked size={22} />}
                            title="Subject Wise"
                            desc="Take attendance subject-wise for each period."
                            onClick={() => updateMode('subject_wise')}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

function ModeCard({ active, icon, title, desc, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`p-5 md:p-6 rounded-[30px] border-4 transition-all text-left flex flex-row items-center gap-5 h-full min-w-[280px] md:min-w-0 flex-1 relative overflow-hidden group ${active
                    ? 'border-blue-600 bg-white shadow-2xl shadow-blue-100 scale-[1.02]'
                    : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
                }`}
        >
            {active && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/5 rounded-bl-[40px] -mr-4 -mt-4 transition-transform group-hover:scale-110" />}

            <div className={`p-3 rounded-2xl shrink-0 transition-colors ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-100'}`}>
                {icon}
            </div>

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
                <p className={`text-[10px] md:text-[11px] font-bold mt-1.5 leading-snug line-clamp-2 uppercase tracking-tight ${active ? 'text-blue-700/70' : 'text-slate-400'}`}>
                    {desc}
                </p>
            </div>
        </button>
    );
}