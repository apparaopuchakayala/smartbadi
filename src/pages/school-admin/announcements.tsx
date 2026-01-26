import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Megaphone, User, Send, Search, Filter,
    CheckCircle2, Loader2, Users, MessageSquare, School,
    Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ControlSkeleton, CardSkeleton } from '../../components/common/skeletoncomp';

export function Announcements() {
    const { profile } = useAuth();
    const school_name = profile?.schools?.name || profile?.school_name;

    // --- TIME STATE ---
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // --- APP STATES ---
    const [activeTab, setActiveTab] = useState<'bulk' | 'single'>('bulk');
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [loading, setLoading] = useState(true);

    // --- SINGLE SEARCH STATES ---
    const [searchQuery, setSearchQuery] = useState('');
    const [foundStudent, setFoundStudent] = useState<any>(null);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (profile?.school_id) fetchClasses();
    }, [profile]);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('school_classes')
                .select('*')
                .eq('school_id', profile.school_id);
            setClasses(data || []);
        } finally {
            setLoading(false);
        }
    };

    const searchStudent = async () => {
        if (!searchQuery) return;
        setSearching(true);
        setFoundStudent(null);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('school_id', profile.school_id)
                .eq('role', 'student')
                .or(`full_name.ilike.%${searchQuery}%,roll_number.eq.${searchQuery}`)
                .limit(1)
                .single();

            if (error || !data) {
                toast.error("Student not found");
            } else {
                setFoundStudent(data);
            }
        } catch (err) {
            toast.error("Search failed");
        } finally {
            setSearching(false);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) return toast.error("Please type a message");
        let targetStudents: any[] = [];

        if (activeTab === 'single') {
            if (!foundStudent) return toast.error("Select a student first");
            targetStudents = [foundStudent];
        } else {
            if (!profile.school_id) return toast.error("Error: User profile missing School ID");

            let query = supabase
                .from('profiles')
                .select('full_name, father_mobile, mother_mobile')
                .eq('school_id', profile.school_id)
                .eq('role', 'student');

            if (selectedClass !== 'all') {
                query = query.eq('current_class', selectedClass);
            }

            const { data, error } = await query;
            if (error) return toast.error("Database Error: " + error.message);
            if (!data || data.length === 0) return toast.error("No students found");
            targetStudents = data;
        }

        if (!window.confirm(`Send this message to ${targetStudents.length} recipients?`)) return;

        setIsSending(true);
        const loadingToast = toast.loading("Dispatching...");

        try {
            const botPayload = targetStudents.map(s => ({
                name: s.full_name,
                mobile: s.father_mobile || s.mother_mobile || s.phone || '',
            }));

            await fetch('http://localhost:3001/send-custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    students: botPayload,
                    messageBody: message,
                    schoolName: school_name || "SmartBadi School"
                })
            });

            toast.success("Broadcast Successful!", { id: loadingToast });
            setMessage('');
        } catch (err) {
            toast.error("WhatsApp Service Offline", { id: loadingToast });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 font-poppins bg-[#F8FAFC] min-h-screen pb-20">

            {/* HEADER: Responsive Center/Left */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-left">
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                        <Megaphone className="text-blue-600 w-8 h-8 md:w-10 md:h-10" /> Communica<span className="text-blue-700">tions</span>
                    </h1>
                    <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-[2px] mt-1 ml-1">WhatsApp Broadcast Control Center</p>
                </div>
                
                {/* TABS: Responsive width */}
                <div className="bg-slate-200/60 p-1.5 rounded-2xl inline-flex w-full md:w-auto shadow-inner">
                    <button onClick={() => setActiveTab('bulk')}
                        className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'bulk' ? 'bg-white shadow-md text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Users size={16} /> Bulk
                    </button>
                    <button onClick={() => setActiveTab('single')}
                        className={`flex-1 md:flex-none px-4 md:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'single' ? 'bg-white shadow-md text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        <User size={16} /> Individual
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* LEFT SIDE: CONFIGURATION (8/12) */}
                <div className="lg:col-span-7 space-y-6">

                    {loading ? <ControlSkeleton /> : (
                        <div className="bg-white p-6 md:p-8 rounded-[35px] border-2 border-blue-50 shadow-sm space-y-5 text-left transition-all hover:border-blue-100">
                            <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Filter size={14} className="text-blue-600"/> Target Audience
                            </label>
                            
                            {activeTab === 'bulk' ? (
                                <div className="relative">
                                    <select
                                        className="w-full pl-6 pr-10 py-4 bg-slate-100 border-2 border-transparent rounded-2xl text-sm font-black text-slate-800 outline-none appearance-none cursor-pointer focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                    >
                                        <option value="all">📢 ALL ENROLLED FAMILIES</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.class_name}>GRADE {c.class_name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                placeholder="Student Name or Roll No..."
                                                className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-transparent rounded-2xl text-sm font-black outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
                                            />
                                        </div>
                                        <button onClick={searchStudent} disabled={searching}
                                            className="px-6 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                                            {searching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                        </button>
                                    </div>

                                    {foundStudent && (
                                        <div className="p-5 border-2 border-blue-600 bg-blue-50/50 rounded-[25px] flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                            <div className="w-14 h-14 bg-blue-700 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg border-2 border-white">
                                                {foundStudent.full_name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-black text-slate-900 uppercase truncate tracking-tight">{foundStudent.full_name}</h3>
                                                <p className="text-[10px] text-blue-600 font-black uppercase mt-1">Grade {foundStudent.current_class} | {foundStudent.roll_number}</p>
                                                <p className="text-[9px] font-bold text-slate-500 mt-0.5">Verified Mobile: {foundStudent.father_mobile || foundStudent.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MESSAGE COMPOSER */}
                    <div className="bg-white p-6 md:p-8 rounded-[35px] border-2 border-white shadow-xl text-left">
                        <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-2 mb-3">
                            <MessageSquare size={14} className="text-blue-600"/> Message Body
                        </label>
                        <textarea
                            className="w-full h-40 md:h-48 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold text-slate-800 outline-none resize-none focus:border-blue-600 focus:bg-white focus:ring-4 ring-blue-50 transition-all shadow-inner placeholder:text-slate-400"
                            placeholder={activeTab === 'bulk' ? "Dear Parents, we would like to inform you that..." : "Type your specific message to the parent here..."}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />

                        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <CheckCircle2 size={14} className="text-emerald-500" /> Auto-Signature: {school_name || 'Principal'}
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={isSending || (activeTab === 'single' && !foundStudent) || !message.trim()}
                                className="w-full sm:w-auto px-10 py-5 bg-blue-700 text-white rounded-[22px] text-[11px] font-black uppercase tracking-[2px] shadow-2xl hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                            >
                                {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                Send Message
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: WHATSAPP PREVIEW (5/12) */}
                <div className="lg:col-span-5 sticky top-8">
                    <div className="text-left mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Live Preview</p>
                    </div>
                    
                    {/* PHONE MOCKUP */}
                    <div className="bg-slate-900 p-4 rounded-[50px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-[10px] border-slate-800 relative mx-auto max-w-[320px]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-10"></div>
                        
                        {/* Status Bar */}
                        <div className="flex justify-between items-center px-6 py-3 mb-4 opacity-70">
                            <span className="text-[11px] text-white font-black tabular-nums">{formattedTime}</span>
                            <div className="flex gap-1.5 items-center">
                                <div className="w-3 h-3 bg-white rounded-sm opacity-60"></div>
                                <Smartphone size={10} className="text-white opacity-60" />
                                <div className="w-5 h-2.5 border-2 border-white/40 rounded-[2px] relative">
                                    <div className="absolute inset-0.5 bg-emerald-400 w-3/4"></div>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Header */}
                        <div className="flex items-center gap-3 px-4 mb-6 border-b border-white/10 pb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-lg">
                                {school_name ? school_name.charAt(0) : 'S'}
                            </div>
                            <div className="text-left">
                                <p className="text-[13px] font-black text-white leading-none">{school_name || 'Admin'}</p>
                                <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Official Hub
                                </p>
                            </div>
                        </div>

                        {/* Message Bubble */}
                        <div className="bg-[#202c33] p-5 rounded-2xl rounded-tl-none relative shadow-xl mb-12 mr-4 border border-white/5">
                            <svg viewBox="0 0 8 13" height="13" width="8" className="absolute -left-2 top-0 text-[#202c33] fill-current">
                                <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                            </svg>

                            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                <span className="text-[9px] font-black text-[#FFD279] uppercase tracking-widest">📢 Notice</span>
                                <span className="text-[9px] font-black text-white/40">{formattedTime}</span>
                            </div>

                            <p className="text-[11px] text-slate-300 mb-3 text-left font-bold italic">
                                Dear Parent of <span className="text-emerald-400 not-italic uppercase">{activeTab === 'single' && foundStudent ? foundStudent.full_name : '[Name]'}</span>,
                            </p>

                            <div className="text-[13px] text-white font-medium text-left leading-relaxed whitespace-pre-wrap">
                                {message || "Start typing in the composer to preview how parents will see your message on their devices..."}
                            </div>

                            <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-3">
                                <School size={16} className="text-emerald-500 shrink-0" />
                                <div className="text-left">
                                    <p className="text-[11px] text-slate-100 font-black uppercase leading-tight">Principal</p>
                                    <p className="text-[10px] text-slate-400 font-bold truncate max-w-[140px] uppercase">{school_name || 'Registry'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Simulation Bar */}
                        <div className="absolute bottom-6 left-6 right-6 h-12 bg-white/5 rounded-full flex items-center px-5 border border-white/10">
                            <span className="text-[11px] text-white/20 font-black uppercase tracking-widest">Read Only Mode</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}