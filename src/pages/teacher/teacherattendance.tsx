import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    UserCheck, UserX, Save, Loader2, Clock,
    CheckCircle2, Lock, Trash2, Filter, AlertTriangle,
    ToggleLeft, ToggleRight, SortAsc, BookOpen, Calendar,
    Unlock, ShieldAlert, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { StudentProfileModal } from '../../components/common/studentprofilemodal';
// Import skeletons
import { CardSkeleton, ControlSkeleton } from '../../components/common/skeletoncomp';

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
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewStudent, setViewStudent] = useState<any>(null);

    // Initial Load
    useEffect(() => {
        if (profile?.id) fetchMyClasses();
    }, [profile]);

    const fetchMyClasses = async () => {
        setPageLoading(true);
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
            const { data: studentList, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('school_id', profile.school_id)
                .eq('role', 'student')
                .eq('current_class', classDetails.class_name)
                .eq('current_section', classDetails.section)
                .order('full_name', { ascending: true });

            if (profileError) throw profileError;

            const { data: existingRecords, error: attError } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('class_name', classDetails.class_name)
                .eq('section', classDetails.section)
                .eq('subject_name', classDetails.subject_name)
                .eq('date', date);

            if (attError) throw attError;

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
        const selectedDate = new Date(date);
        const today = new Date();
        selectedDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) return toast.error("Cannot mark attendance for future dates!");

        const currentClass = myClasses.find(c => c.id === selectedClassId);
        if (action === 'finalize' && !window.confirm("Finalize Attendance? This will lock records.")) return;
        if (action === 'delete' && !window.confirm("Delete these records?")) return;

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
                toast.success("Records Removed");
            } else {
                const isFinal = action === 'finalize';
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

                const { error } = await supabase.from('student_attendance').upsert(records, { onConflict: 'student_id, subject_name, date' });
                if (error) throw error;

                setMetaData({
                    status: isFinal ? 'finalized' : 'saved',
                    markedBy: profile.full_name,
                    markedAt: new Date().toISOString()
                });
                toast.success(isFinal ? "Registry Locked" : "Progress Saved");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const sortedStudents = [...students].filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employee_id?.includes(searchQuery)
    ).sort((a, b) =>
        sortBy === 'roll'
            ? (a.roll_number || '').localeCompare(b.roll_number || '', undefined, { numeric: true })
            : a.full_name.localeCompare(b.full_name)
    );

    const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
    const absentCount = Object.values(attendanceData).filter(s => s === 'absent').length;
    const isLocked = metaData.status === 'finalized';

    if (pageLoading) return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
            <ControlSkeleton />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-3 md:p-8 space-y-6 font-poppins pb-32 bg-[#F8FAFC] min-h-screen text-left transition-all">

            <AnimatePresence>
                {viewStudent && <StudentProfileModal student={viewStudent} onClose={() => setViewStudent(null)} />}
            </AnimatePresence>

            {/* --- TOP SELECTOR BAR --- */}
            <div className="bg-white p-5 md:p-8 rounded-[35px] shadow-lg border-2 border-white flex flex-col lg:flex-row gap-6 items-end transition-all">
                <div className="flex-1 w-full space-y-3">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-[2px] ml-1 flex items-center gap-2">
                        <BookOpen size={18} className="text-blue-700" /> assigned academic units
                    </label>
                    <div className="relative">
                        <select
                            className="w-full pl-6 pr-10 py-4 bg-slate-100 border-2 border-transparent rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none shadow-inner"
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <option value="">-- CHOOSE ACTIVE CLASS --</option>
                            {myClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    CLASS {cls.class_name}-{cls.section} | {cls.subject_name.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={18} />
                    </div>
                </div>
                <div className="w-full lg:w-72 space-y-3">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-[2px] ml-1 flex items-center gap-2">
                        <Calendar size={18} className="text-blue-700" /> session date
                    </label>
                    <input
                        type="date"
                        className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-all cursor-pointer shadow-inner"
                        value={date}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
            </div>

            {selectedClassId ? (
                <>
                    {/* --- STATUS BANNER: Responsive and High Visibility --- */}
                    <div className={`w-full p-6 md:p-8 rounded-[35px] flex flex-col md:flex-row items-center justify-between gap-6 border-4 shadow-2xl transition-all ${isLocked ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-blue-600 text-slate-900'}`}>
                        <div className="flex items-center gap-6 text-left">
                            <div className={`p-4 rounded-2xl shadow-inner ${isLocked ? 'bg-white/20 text-white' : 'bg-blue-700 text-white'}`}>
                                {isLocked ? <Lock size={32} strokeWidth={2.5} /> : <Unlock size={32} strokeWidth={2.5} />}
                            </div>
                            <div>
                                <h4 className="font-black text-xl uppercase tracking-tighter leading-none">
                                    {isLocked ? 'Registry Secured' : 'Registry Dynamic'}
                                </h4>
                                <p className={`text-[10px] font-bold uppercase tracking-widest opacity-80 mt-2 leading-relaxed`}>
                                    {metaData.status === 'new' ? 'Awaiting initial check-in' : `Authorized by ${metaData.markedBy}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-8 bg-black/5 px-6 md:px-10 py-4 rounded-[28px] border border-black/5 shadow-inner">
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Present</p>
                                <p className={`text-2xl md:text-4xl font-black ${isLocked ? 'text-white' : 'text-emerald-600'}`}>{presentCount}</p>
                            </div>
                            <div className="w-[2px] h-10 bg-black/10" />
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Absent</p>
                                <p className={`text-2xl md:text-4xl font-black ${isLocked ? 'text-white' : 'text-red-500'}`}>{absentCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* --- SEARCH & BULK CONTROLS --- */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 md:p-5 rounded-[28px] border-2 border-slate-100 shadow-xl sticky top-4 z-30 transition-all">
                        <div className="relative w-full md:w-80 lg:w-96">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input placeholder="Filter student list..." className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-xs font-black text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button onClick={handleBulkSwitch} disabled={isLocked} className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-6 md:px-10 py-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isAllAbsent ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'} ${isLocked ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-105'}`}>
                                {isAllAbsent ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                                {isAllAbsent ? 'Mark All Absent' : 'Mark All Present'}
                            </button>
                        </div>
                    </div>

                    {/* --- STUDENT LIST: Responsive Grid --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {loading ? (
                            [1,2,3,4,5,6,7,8].map(i => <CardSkeleton key={i} />)
                        ) : (
                            sortedStudents.map((student) => {
                                const status = attendanceData[student.id] || 'present';
                                const isActive = (s: string) => attendanceData[student.id] === s;

                                return (
                                    <motion.div
                                        layout
                                        key={student.id}
                                        className={`p-1 rounded-[40px] transition-all duration-500 bg-gradient-to-br ${status === 'absent' ? 'from-red-200 to-transparent' : status === 'late' ? 'from-orange-200 to-transparent' : 'from-blue-100 to-transparent'}`}
                                    >
                                        <div className="bg-white p-6 rounded-[38px] border-2 border-white shadow-xl relative h-full flex flex-col justify-between hover:border-blue-400 transition-all text-center">
                                            <div className="flex flex-col items-center gap-4 mb-6 cursor-pointer" onClick={() => setViewStudent(student)}>
                                                <div className="w-20 h-20 bg-blue-700 rounded-3xl border-4 border-white shadow-2xl flex items-center justify-center font-black text-white text-2xl shrink-0 group-hover:scale-110 transition-transform">
                                                    {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover rounded-2xl" alt="" /> : student.full_name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[9px] font-black text-blue-700 uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-100">ROLL: {student.roll_number || 'ID-00'}</span>
                                                    <h4 className="text-md font-black text-slate-900 truncate mt-3 leading-tight uppercase tracking-tight">{student.full_name}</h4>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-[22px] border-2 border-slate-100 shadow-inner">
                                                {['present', 'absent', 'late'].map((s) => (
                                                    <button
                                                        key={s}
                                                        disabled={isLocked}
                                                        onClick={() => setAttendanceData({ ...attendanceData, [student.id]: s })}
                                                        className={`py-3 rounded-[18px] text-[10px] font-black uppercase flex flex-col items-center gap-1 transition-all ${isActive(s) ? (s === 'present' ? 'bg-emerald-600 text-white shadow-xl scale-105' : s === 'absent' ? 'bg-red-600 text-white shadow-xl scale-105' : 'bg-orange-500 text-white shadow-xl scale-105') : 'bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                                    >
                                                        {s === 'present' ? 'P' : s === 'absent' ? 'A' : 'L'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* --- BOTTOM ACTIONS --- */}
                    <div className="mt-12 bg-white p-6 md:p-10 rounded-[45px] shadow-2xl border-4 border-white flex flex-col lg:flex-row items-center justify-between gap-8 sticky bottom-4 z-40 transition-all">
                        <div className="text-slate-900 text-[11px] md:text-sm font-black uppercase tracking-[3px] flex items-center gap-4 text-left">
                            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl shadow-inner border border-blue-100">
                                <ShieldAlert size={24} />
                            </div>
                            Verified Class Strength: <span className="text-blue-700 text-2xl md:text-3xl ml-2">{students.length}</span>
                        </div>
                        
                        {!isLocked ? (
                            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                {metaData.status !== 'new' && (
                                    <button onClick={() => handleAction('delete')} disabled={isSubmitting} className="flex-1 py-4 md:py-5 px-8 bg-red-50 text-red-600 rounded-[22px] text-[11px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white border-2 border-red-100 transition-all flex items-center justify-center gap-3 shadow-lg">
                                        <Trash2 size={18} /> Wipe Session
                                    </button>
                                )}
                                <button onClick={() => handleAction('save')} disabled={isSubmitting} className="flex-1 py-4 md:py-5 px-10 bg-slate-900 text-white rounded-[22px] text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95">
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Work
                                </button>
                                <button onClick={() => handleAction('finalize')} disabled={isSubmitting} className="flex-1 py-4 md:py-5 px-12 bg-blue-700 text-white rounded-[22px] text-[11px] font-black uppercase tracking-[2px] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 border-b-4 border-blue-900 active:border-b-0 active:scale-95">
                                    <Lock size={18} /> Finalize & Authorize
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-6 px-10 py-5 bg-emerald-50 rounded-[30px] border-4 border-emerald-100 shadow-inner group">
                                <CheckCircle2 size={36} className="text-emerald-600 animate-bounce group-hover:animate-none" />
                                <div className="text-left">
                                    <span className="text-sm font-black text-emerald-800 uppercase tracking-[2px]">Registry Authorized</span>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 opacity-70">Cloud Sync Completed Successfully</p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="py-40 text-center flex flex-col items-center justify-center gap-8 border-4 border-dashed border-slate-200 rounded-[60px] bg-white shadow-inner mx-2">
                    <div className="w-28 h-28 bg-blue-50 rounded-[40px] flex items-center justify-center text-blue-300 shadow-xl border-4 border-white animate-pulse">
                        <BookOpen size={64} strokeWidth={1} />
                    </div>
                    <div className="space-y-3">
                        <p className="text-slate-900 font-black uppercase text-lg md:text-xl tracking-[6px] md:tracking-[10px]">Registry Portal Offline</p>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[3px]">Select an Assigned Class to Initialize Tracking</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-components logic
const FormSelectSkeleton = () => (
    <div className="flex flex-col lg:flex-row gap-6 items-end bg-white p-8 rounded-[35px] animate-pulse border-2 border-slate-100">
        <div className="flex-1 w-full space-y-4">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-14 w-full bg-slate-100 rounded-2xl" />
        </div>
        <div className="w-full lg:w-72 space-y-4">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-14 w-full bg-slate-100 rounded-2xl" />
        </div>
    </div>
);