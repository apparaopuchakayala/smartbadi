import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    UserCheck, UserX, Save, Loader2, Clock,
    CheckCircle2, Lock, Trash2, Filter, AlertTriangle,
    ToggleLeft, ToggleRight, SortAsc, BookOpen, Calendar,
    X, Printer, FileText, Activity, CalendarCheck, User, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { StudentProfileModal } from '../admin/studentprofilemodal';

export function TeacherAttendance() {
    const { profile } = useAuth();

    // STATES
    const [myClasses, setMyClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [students, setStudents] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<any>({});
    const [metaData, setMetaData] = useState<any>({ status: 'new', markedBy: '', markedAt: null });
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'roll' | 'name'>('roll');
    const [isAllAbsent, setIsAllAbsent] = useState(false);

    // Date State (Defaults to Today)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // SELECTED STUDENT PROFILE STATE
    const [viewStudent, setViewStudent] = useState<any>(null);

    // Initial Load
    useEffect(() => {
        if (profile?.id) fetchMyClasses();
    }, [profile]);

    const fetchMyClasses = async () => {
        try {
            const { data, error } = await supabase
                .from('teacher_assignments')
                .select('*')
                .eq('school_id', profile.school_id)
                .eq('teacher_id', profile.id);

            if (error) throw error;
            setMyClasses(data || []);
        } catch (err: any) {
            toast.error("Failed to load classes");
        } finally {
            setPageLoading(false);
        }
    };

    // Fetch Data on Change
    useEffect(() => {
        if (selectedClassId && date) {
            const selectedClass = myClasses.find(c => c.id === selectedClassId);
            if (selectedClass) fetchRegistry(selectedClass);
        }
    }, [selectedClassId, date]);

    const fetchRegistry = async (classDetails: any) => {
        setLoading(true);
        try {
            // 1. Fetch Students
            const { data: studentList, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('school_id', profile.school_id)
                .eq('role', 'student')
                .eq('current_class', classDetails.class_name)
                .eq('current_section', classDetails.section)
                .order('full_name', { ascending: true });

            if (profileError) throw profileError;
            
            // 2. Fetch Attendance
            const { data: existingRecords, error: attError } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('class_name', classDetails.class_name)
                .eq('section', classDetails.section)
                .eq('subject_name', classDetails.subject_name)
                .eq('date', date);

            if (attError) throw attError;

            // 3. Map Data
            const statusMap: any = {};
            let currentMeta = { status: 'new', markedBy: '', markedAt: null };

            if (existingRecords && existingRecords.length > 0) {
                existingRecords.forEach((r: any) => statusMap[r.student_id] = r.status);
                const record = existingRecords[0];
                currentMeta = {
                    status: record.is_finalized ? 'finalized' : 'saved',
                    markedBy: record.marked_by,
                    markedAt: record.marked_at
                };
            } else {
                studentList?.forEach(s => statusMap[s.id] = 'present');
            }
            setStudents(studentList || []);
            setAttendanceData(statusMap);
            setMetaData(currentMeta);
        } catch (err: any) {
            toast.error("Error loading data");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSwitch = () => {
        const newValue = !isAllAbsent;
        setIsAllAbsent(newValue);
        const newStatus = newValue ? 'absent' : 'present';
        const updatedData = { ...attendanceData };
        students.forEach(s => updatedData[s.id] = newStatus);
        setAttendanceData(updatedData);
    };

    const handleAction = async (action: 'save' | 'finalize' | 'delete') => {
        if (!selectedClassId) return;

        // --- 1. FUTURE DATE CHECK ---
        const selectedDate = new Date(date);
        const today = new Date();
        selectedDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            return toast.error("Cannot mark attendance for future dates!");
        }

        const currentClass = myClasses.find(c => c.id === selectedClassId);

        // --- 2. CONFIRMATION DIALOG ---
        if (action === 'finalize' && !window.confirm("Confirm Finalize? This will lock records and send WhatsApp alerts to parents of absent students.")) return;
        if (action === 'delete' && !window.confirm("Delete all records for this day?")) return;

        setIsSubmitting(true);
        try {
            if (action === 'delete') {
                await supabase.from('student_attendance').delete().match({
                    class_name: currentClass.class_name,
                    section: currentClass.section,
                    subject_name: currentClass.subject_name,
                    date: date
                });

                const reset: any = {};
                students.forEach(s => reset[s.id] = 'present');
                setAttendanceData(reset);
                setMetaData({ status: 'new', markedBy: '', markedAt: null });
                toast.success("Records Deleted");
            } else {
                const isFinal = action === 'finalize';

                // Prepare Records
                const records = students.map(s => ({
                    school_id: profile.school_id,
                    student_id: s.id,
                    teacher_id: profile.id,
                    class_name: currentClass.class_name,
                    section: currentClass.section,
                    subject_name: currentClass.subject_name,
                    date: date,
                    status: attendanceData[s.id] || 'present',
                    academic_year: currentClass.academic_year || '2025-2026',
                    is_finalized: isFinal,
                    marked_by: profile.full_name,
                    marked_at: new Date().toISOString()
                }));

                // Save to Database
                const { error } = await supabase.from('student_attendance').upsert(records, { onConflict: 'student_id, subject_name, date' });

                if (error) {
                    if (error.message.includes('future dates')) throw new Error("Server Error: Future dates not allowed.");
                    throw error;
                }

                // --- 3. WHATSAPP INTEGRATION LOGIC ---
                if (isFinal) {
                    const absentList = students.filter(s => attendanceData[s.id] === 'absent');

                    if (absentList.length > 0) {
                        const wsToast = toast.loading("Syncing with WhatsApp Bot...");
                    
                        try {
                            // Prepare payload for Bot
                            const botPayload = absentList.map(s => ({
                                name: s.full_name,
                                // Priority: Father > Mother > Student
                                mobile: s.father_mobile || '',
                                date: date,
                                school_name : profile.schools.name
                            }));

                            // Send to Local Node.js Server
                            const response = await fetch('http://localhost:3001/send-absent', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ students: botPayload })
                            });

                            const resData = await response.json();

                            if (resData.success) {
                                toast.success(`WhatsApp: ${resData.sent} Sent, ${resData.failed} Failed`, { id: wsToast });
                            } else {
                                toast.error("Bot Error: Check Console", { id: wsToast });
                            }
                        } catch (wsError) {
                            console.error(wsError);
                            toast.error("WhatsApp Bot Offline (Is Node Running?)", { id: wsToast });
                        }
                    }
                }
                // -------------------------------------

                setMetaData({
                    status: isFinal ? 'finalized' : 'saved',
                    markedBy: profile.full_name,
                    markedAt: new Date().toISOString()
                });
                toast.success(isFinal ? "Attendance Locked!" : "Draft Saved");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTime = (isoString: string) => isoString ? new Date(isoString).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, day: 'numeric', month: 'short' }) : '';

    const sortedStudents = [...students].filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employee_id?.includes(searchQuery)
    ).sort((a, b) =>
        sortBy === 'roll'
            ? (a.roll_number || a.employee_id || '').localeCompare(b.roll_number || b.employee_id || '', undefined, { numeric: true })
            : a.full_name.localeCompare(b.full_name)
    );

    const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
    const absentCount = Object.values(attendanceData).filter(s => s === 'absent').length;
    const isLocked = metaData.status === 'finalized';

    if (pageLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 font-poppins pb-32">

            <AnimatePresence>
                {viewStudent && <StudentProfileModal student={viewStudent} onClose={() => setViewStudent(null)} />}
            </AnimatePresence>

            {/* SELECTION HEADER */}
            <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Class</label>
                    <div className="relative">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <select
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer"
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <option value="">-- Choose a Class --</option>
                            {myClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    Class {cls.class_name} - {cls.section} ({cls.subject_name})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="w-full md:w-64 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="date"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none cursor-pointer"
                            value={date}
                            max={new Date().toISOString().split('T')[0]} // HTML Limit
                            onChange={(e) => {
                                const selected = e.target.value;
                                if (selected > new Date().toISOString().split('T')[0]) {
                                    toast.error("Future dates are not allowed");
                                    return;
                                }
                                setDate(selected);
                            }}
                        />
                    </div>
                </div>
            </div>

            {selectedClassId ? (
                <>
                    {/* STATUS BANNER */}
                    <div className={`w-full p-5 rounded-[30px] flex flex-col md:flex-row items-center justify-between gap-6 border-l-8 shadow-sm transition-all ${metaData.status === 'finalized' ? 'bg-green-50 border-green-500 text-green-900' : metaData.status === 'saved' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-orange-50 border-orange-400 text-orange-900'}`}>
                        <div className="flex items-center gap-5 w-full md:w-auto">
                            <div className={`p-4 rounded-full shadow-sm ${metaData.status === 'finalized' ? 'bg-green-100 text-green-600' : metaData.status === 'saved' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                {metaData.status === 'finalized' ? <Lock size={28} /> : metaData.status === 'saved' ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
                            </div>
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-widest">
                                    {metaData.status === 'finalized' ? 'Attendance Finalized' : metaData.status === 'saved' ? 'Draft Saved' : 'Attendance Not Yet Recorded'}
                                </h4>
                                {metaData.status !== 'new' && <p className="text-xs font-semibold opacity-70 mt-1">Saved by <span className="font-bold underline uppercase">{metaData.markedBy}</span> at {formatTime(metaData.markedAt)}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-6 bg-white/60 px-8 py-3 rounded-[20px] border border-black/5 shadow-sm w-full md:w-auto justify-between md:justify-end">
                            <div className="text-center"><p className="text-[9px] font-black opacity-50 uppercase tracking-widest">Present</p><p className="text-2xl font-black text-green-600">{presentCount}</p></div>
                            <div className="w-[1px] h-10 bg-black/10"></div>
                            <div className="text-center"><p className="text-[9px] font-black opacity-50 uppercase tracking-widest">Absent</p><p className="text-2xl font-black text-red-500">{absentCount}</p></div>
                            <div className="w-[1px] h-10 bg-black/10"></div>
                            <div className="text-center"><p className="text-[9px] font-black opacity-50 uppercase tracking-widest">Total</p><p className="text-2xl font-black text-slate-700">{students.length}</p></div>
                        </div>
                    </div>

                    {/* CONTROLS */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-[30px] border border-slate-100 shadow-sm sticky top-4 z-30">
                        <div className="relative w-full md:w-72">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input placeholder="Search by Name or Roll No..." className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-none focus:ring-2 focus:ring-blue-100 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                            <button onClick={() => setSortBy(prev => prev === 'roll' ? 'name' : 'roll')} className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-all whitespace-nowrap"><SortAsc size={16} /> Sort: {sortBy === 'roll' ? 'Roll No' : 'Name'}</button>
                            <button onClick={handleBulkSwitch} disabled={isLocked} className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap shadow-md active:scale-95 ${isAllAbsent ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} ${isLocked ? 'opacity-50 cursor-not-allowed saturate-0' : ''}`}>{isAllAbsent ? <ToggleRight size={18} /> : <ToggleLeft size={18} />} {isAllAbsent ? 'Mark All Absent' : 'Mark All Present'}</button>
                        </div>
                    </div>

                    {/* STUDENTS GRID */}
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sortedStudents.map((student) => {
                                const status = attendanceData[student.id] || 'present';
                                const cardStyle = status === 'absent' ? 'border-red-100 bg-red-50/40' : status === 'late' ? 'border-orange-100 bg-orange-50/40' : 'border-slate-100 bg-white';
                                return (
                                    <motion.div
                                        layout
                                        key={student.id}
                                        className={`p-5 rounded-[30px] border-2 shadow-sm relative overflow-hidden group cursor-pointer ${cardStyle}`}
                                        onClick={() => setViewStudent(student)}
                                    >
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-14 h-14 bg-white rounded-[18px] border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                                                {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-slate-300">IMG</span>}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <span className="text-[9px] font-black bg-white/80 px-2 py-1 rounded-md text-slate-500 uppercase tracking-wider border border-slate-100/50 shadow-sm">{student.roll_number || student.employee_id || 'N/A'}</span>
                                                <h4 className="text-sm font-black text-slate-800 truncate mt-2 leading-tight">{student.full_name}</h4>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 bg-white/60 p-1.5 rounded-[20px] border border-slate-100/50">
                                            {['present', 'absent', 'late'].map((s) => (
                                                <button
                                                    key={s}
                                                    disabled={isLocked}
                                                    onClick={(e) => { e.stopPropagation(); setAttendanceData({ ...attendanceData, [student.id]: s }); }}
                                                    className={`py-2.5 rounded-[14px] text-[9px] font-black uppercase flex justify-center ${attendanceData[student.id] === s ? (s === 'present' ? 'bg-green-500 text-white shadow-md' : s === 'absent' ? 'bg-red-500 text-white shadow-md' : 'bg-orange-400 text-white shadow-md') : 'bg-transparent text-slate-400 hover:bg-white hover:text-slate-600'} ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                                                >
                                                    {s.charAt(0).toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* STATIC BOTTOM ACTIONS */}
                    <div className="mt-12 bg-white p-6 rounded-[35px] border border-slate-200 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">{students.length} Students in List</div>
                        {!isLocked ? (
                            <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
                                {metaData.status !== 'new' && <button onClick={() => handleAction('delete')} disabled={isSubmitting} className="px-6 py-4 bg-red-50 text-red-500 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"><Trash2 size={16} /> Delete</button>}
                                <button onClick={() => handleAction('save')} disabled={isSubmitting} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save Draft</button>
                                <button onClick={() => handleAction('finalize')} disabled={isSubmitting} className="px-10 py-4 bg-slate-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all flex items-center gap-2"><Lock size={16} /> Finalize</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 px-8 py-4 bg-slate-50 rounded-[20px] border border-slate-200 w-full md:w-auto justify-center"><Lock size={18} className="text-slate-400" /><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Record Locked</span></div>
                        )}
                    </div>
                </>
            ) : (
                <div className="py-40 text-center flex flex-col items-center gap-4 border-2 border-dashed border-slate-200 rounded-[40px]">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300"><BookOpen size={40} /></div>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Please select a class to mark attendance</p>
                </div>
            )}
        </div>
    );
}