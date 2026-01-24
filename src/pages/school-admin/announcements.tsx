import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Megaphone, User, Send, Search, Filter,
    CheckCircle2, Loader2, Users, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Announcements() {
    const { profile } = useAuth();
    const school_name = profile?.schools?.name || profile?.school_name;

    // --- TIME STATE (For Live Clock in Preview) ---
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Update clock every minute
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Format time (e.g., "10:45 AM")
    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });


    // --- APP STATES ---
    const [activeTab, setActiveTab] = useState<'bulk' | 'single'>('bulk');
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // --- SINGLE SEARCH STATES ---
    const [searchQuery, setSearchQuery] = useState('');
    const [foundStudent, setFoundStudent] = useState<any>(null);
    const [searching, setSearching] = useState(false);

    // Initial Load
    useEffect(() => {
        if (profile?.school_id) fetchClasses();
    }, [profile]);

    const fetchClasses = async () => {
        const { data } = await supabase
            .from('school_classes')
            .select('*')
            .eq('school_id', profile.school_id);
        setClasses(data || []);
    };

    // --- LOGIC 1: SEARCH STUDENT (For Single Message) ---
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

    // --- LOGIC 2: SEND MESSAGE (Universal) ---
    const handleSend = async () => {
        if (!message.trim()) return toast.error("Please type a message");

        let targetStudents: any[] = [];

        if (activeTab === 'single') {
            if (!foundStudent) return toast.error("Select a student first");
            targetStudents = [foundStudent];
        } else {
            // BULK: Fetch recipients based on filter
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

            if (error) {
                console.error("Supabase Error:", error);
                return toast.error("Database Error: " + error.message);
            }

            if (!data || data.length === 0) {
                return toast.error("No students found for this selection");
            }
            targetStudents = data;
        }

        if (!window.confirm(`Send this message to ${targetStudents.length} parent(s)?`)) return;

        setIsSending(true);
        const loadingToast = toast.loading("Dispatching messages...");

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

            toast.success("Messages Sent Successfully!", { id: loadingToast });
            setMessage('');
        } catch (err) {
            console.error(err);
            toast.error("Failed to connect to Bot", { id: loadingToast });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-8xl mx-auto p-6 space-y-8 font-poppins">

            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <Megaphone className="text-blue-600" /> Communications
                </h1>
                <p className="text-slate-500 text-sm mt-1">Send updates via WhatsApp to parents.</p>
            </div>

            {/* TABS */}
            <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex">
                <button
                    onClick={() => setActiveTab('bulk')}
                    className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'bulk' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={16} /> Bulk Broadcast
                </button>
                <button
                    onClick={() => setActiveTab('single')}
                    className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'single' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <User size={16} /> Individual Message
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT SIDE: CONFIGURATION */}
                <div className="lg:col-span-2 space-y-6">

                    {/* --- BULK MODE UI --- */}
                    {activeTab === 'bulk' && (
                        <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recipient Group</label>
                            <div className="relative">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer border border-transparent focus:border-blue-100 focus:bg-blue-50/30 transition-all"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    <option value="all">📢 All Students & Parents</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.class_name}>Class {c.class_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                                <CheckCircle2 className="text-blue-600 mt-0.5" size={18} />
                                <div>
                                    <h4 className="text-xs font-bold text-blue-800">Ready to Broadcast</h4>
                                    <p className="text-[10px] text-blue-600 mt-1">This will send a message to all selected parents using the queue system to prevent spam bans.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SINGLE MODE UI --- */}
                    {activeTab === 'single' && (
                        <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Find Student</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        placeholder="Enter Name or Roll Number..."
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
                                    />
                                </div>
                                <button
                                    onClick={searchStudent}
                                    disabled={searching}
                                    className="px-6 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all"
                                >
                                    {searching ? <Loader2 className="animate-spin" /> : <Search />}
                                </button>
                            </div>

                            {/* FOUND STUDENT CARD */}
                            {foundStudent && (
                                <div className="mt-4 p-5 border-2 border-blue-100 bg-blue-50/30 rounded-[25px] flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                                        🎓
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800">{foundStudent.full_name}</h3>
                                        <p className="text-xs text-slate-500 font-medium">Class {foundStudent.current_class} | Parent: {foundStudent.father_name || 'N/A'}</p>
                                        <p className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full inline-block mt-1 font-bold">
                                            Ph: {foundStudent.father_mobile || foundStudent.phone}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- MESSAGE COMPOSER --- */}
                    <div className="bg-white p-6 rounded-[35px] border border-slate-100 shadow-lg">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Compose Message</label>
                        <textarea
                            className="w-full h-35 p-5 mt-2 bg-slate-50 rounded-2xl text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder={activeTab === 'bulk' ? "Example: Dear Parents, School will be closed tomorrow due to heavy rains..." : "Type your personal message here..."}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        ></textarea>

                        <div className="mt-4 flex justify-between items-center">
                            <p className="text-[10px] text-slate-400 font-bold">* Auto-signature will be added</p>
                            <button
                                onClick={handleSend}
                                disabled={isSending || (activeTab === 'single' && !foundStudent)}
                                className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                Send Message
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: PREVIEW / TIPS */}
                <div className="space-y-6">
                    {/* Phone Mockup Container */}
                    <div className="bg-slate-900 p-4 rounded-[40px] shadow-2xl border-[8px] border-slate-800 relative overflow-hidden">

                        {/* Dynamic Island / Notch Simulation */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-10"></div>

                        {/* Phone Status Bar */}
                        <div className="flex justify-between items-center px-4 py-2 mb-4 opacity-70">
                            {/* DYNAMIC TIME HERE */}
                            <span className="text-[10px] text-white font-medium">{formattedTime}</span>
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 bg-white rounded-full opacity-60"></div> {/* Signal */}
                                <div className="w-3 h-3 bg-white rounded-full opacity-60"></div> {/* Wifi */}
                                <div className="w-4 h-2.5 border border-white rounded-sm opacity-60"></div> {/* Battery */}
                            </div>
                        </div>

                        {/* WhatsApp Header Simulation */}
                        <div className="flex items-center gap-3 px-2 mb-6 border-b border-white/10 pb-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs">
                                {school_name ? school_name.charAt(0) : 'S'}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white leading-none">{school_name || 'SmartBadi School'}</p>
                                <p className="text-[9px] text-emerald-400 mt-1">Official Account ✅</p>
                            </div>
                        </div>

                        {/* THE MESSAGE BUBBLE (Dark Mode Style) */}
                        <div className="bg-[#202c33] p-4 rounded-xl rounded-tl-none relative shadow-md mb-8 mr-4">
                            {/* Bubble Tail SVG */}
                            <svg viewBox="0 0 8 13" height="13" width="8" className="absolute -left-2 top-0 text-[#202c33] fill-current">
                                <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
                            </svg>

                            {/* Header Tag */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[9px] font-bold text-[#FFD279] uppercase tracking-wider">📢 Official Notice</span>
                            </div>

                            {/* Greeting */}
                            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                                Dear Parent of <span className="font-bold text-white">{activeTab === 'single' && foundStudent ? foundStudent.full_name : '[Student Name]'}</span>,
                            </p>

                            {/* Actual Message Body */}
                            <div className="text-sm text-white font-normal leading-relaxed whitespace-pre-wrap">
                                {message || "Start typing to preview your message here..."}
                            </div>

                            {/* Footer / Signature */}
                            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                                <div className="w-1 h-8 bg-emerald-500 rounded-full"></div>
                                <p className="text-[10px] text-slate-400 italic">
                                    Principal,<br />
                                    <span className="font-semibold text-slate-300">{school_name || 'School Admin'}</span>
                                </p>
                            </div>

                            {/* Timestamp & Checks */}
                            <div className="flex justify-end items-center gap-1 mt-2">
                                {/* DYNAMIC TIME HERE ALSO */}
                                <span className="text-[9px] text-slate-500">{formattedTime}</span>
                                {/* Double Blue Ticks */}
                                <div className="flex text-[#53bdeb]">
                                    <CheckCircle2 size={10} />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Input Simulation */}
                        <div className="absolute bottom-4 left-4 right-4 h-10 bg-slate-800 rounded-full flex items-center px-4 opacity-50">
                            <span className="text-[10px] text-slate-500">Type a message...</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}