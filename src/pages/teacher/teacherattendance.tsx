import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    UserCheck, UserX, Save, Loader2, Clock,
    CheckCircle2, Lock, Trash2, Filter, AlertTriangle,
    ToggleLeft, ToggleRight, SortAsc, BookOpen, Calendar,
    Unlock, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { StudentProfileModal } from '../../components/common/studentprofilemodal';

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

    if (pageLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-700" size={50} /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 font-poppins pb-32 bg-[#F8FAFC] min-h-screen text-left">

            <AnimatePresence>
                {viewStudent && <StudentProfileModal student={viewStudent} onClose={() => setViewStudent(null)} />}
            </AnimatePresence>

            {/* --- TOP SELECTOR BAR: High Contrast --- */}
            <div className="bg-white p-6 rounded-[35px] shadow-lg border-2 border-blue-100 flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full space-y-3">
                    <label className="text-[11px] font-black text-slate-900 uppercase tracking-[2px] ml-1 flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-600" /> <h1 className="text-lg font-black text-slate-800 uppercase tracking-tighter leading-none">
                            Assigned <span className="text-[#8DC63F]">Classes</span>
                        </h1>
                    </label>
                    <div className="relative">
                        <select
                            className="w-full pl-6 pr-10 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-blue-600 transition-all appearance-none"
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <option value="">-- Select Active Class --</option>
                            {myClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    CLASS {cls.class_name}-{cls.section} | {cls.subject_name.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <SortAsc className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                </div>
                <div className="w-full md:w-72 space-y-3">
                    <label className="text-[11px] font-black text-slate-900 uppercase tracking-[2px] ml-1 flex items-center gap-2">
                        <Calendar size={14} className="text-blue-600" /> Target Date
                    </label>
                    <input
                        type="date"
                        className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:border-blue-600 transition-all cursor-pointer"
                        value={date}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
            </div>

            {selectedClassId ? (
                <>
                    {/* --- STATUS BANNER: High Contrast --- */}
                    <div className={`w-full p-6 rounded-[35px] flex flex-col md:flex-row items-center justify-between gap-6 border-2 shadow-xl transition-all ${isLocked ? 'bg-green-600 border-green-700 text-white' : 'bg-white border-blue-600 text-slate-900'}`}>
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl shadow-inner ${isLocked ? 'bg-white/20 text-white' : 'bg-blue-700 text-white'}`}>
                                {isLocked ? <Lock size={32} /> : <Unlock size={32} />}
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-lg uppercase tracking-tighter">
                                    {isLocked ? 'Registry Locked' : 'Registry Active'}
                                </h4>
                                <p className={`text-xs font-bold uppercase tracking-widest opacity-80 mt-1`}>
                                    {metaData.status === 'new' ? 'New Session' : `Modified by ${metaData.markedBy}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 bg-black/5 px-8 py-4 rounded-[25px] border border-black/5">
                            <div className="text-center"><p className="text-[10px] font-black uppercase tracking-widest opacity-60">Present</p><p className="text-3xl font-black text-green-500">{presentCount}</p></div>
                            <div className="text-center"><p className="text-[10px] font-black uppercase tracking-widest opacity-60">Absent</p><p className="text-3xl font-black text-red-500">{absentCount}</p></div>
                        </div>
                    </div>

                    {/* --- SEARCH & BULK CONTROLS --- */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-5 rounded-[30px] border-2 border-slate-200 shadow-md sticky top-4 z-30">
                        <div className="relative w-full md:w-80">
                            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input placeholder="Quick Find Student..." className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-blue-600 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleBulkSwitch} disabled={isLocked} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isAllAbsent ? 'bg-red-600 text-white' : 'bg-green-600 text-white'} ${isLocked ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}>
                                {isAllAbsent ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                {isAllAbsent ? 'Set All Absent' : 'Set All Present'}
                            </button>
                        </div>
                    </div>

                    {/* --- STUDENT LIST: High Visibility Cards --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sortedStudents.map((student) => {
                            const status = attendanceData[student.id] || 'present';
                            const isActive = (s: string) => attendanceData[student.id] === s;

                            return (
                                <motion.div
                                    layout
                                    key={student.id}
                                    className={`p-1 rounded-[38px] transition-all bg-gradient-to-b ${status === 'absent' ? 'from-red-200 to-transparent' : 'from-blue-100 to-transparent'}`}
                                >
                                    <div className="bg-white p-6 rounded-[36px] border-2 border-white shadow-lg relative h-full flex flex-col justify-between hover:border-blue-400 transition-all">
                                        <div className="flex items-start gap-4 mb-6" onClick={() => setViewStudent(student)}>
                                            <div className="w-16 h-16 bg-blue-700 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center font-black text-white text-xl shrink-0">
                                                {student.full_name.charAt(0)}
                                            </div>
                                            <div className="min-w-0 pt-1 text-left">
                                                <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">#{student.roll_number || 'N/A'}</span>
                                                <h4 className="text-md font-black text-slate-900 truncate mt-2 leading-tight uppercase tracking-tighter">{student.full_name}</h4>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-2 rounded-2xl border-2 border-slate-200">
                                            {['present', 'absent', 'late'].map((s) => (
                                                <button
                                                    key={s}
                                                    disabled={isLocked}
                                                    onClick={() => setAttendanceData({ ...attendanceData, [student.id]: s })}
                                                    className={`py-3 rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1 transition-all ${isActive(s) ? (s === 'present' ? 'bg-green-600 text-white shadow-lg scale-105' : s === 'absent' ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-orange-500 text-white shadow-lg scale-105') : 'bg-white text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {s === 'present' ? 'P' : s === 'absent' ? 'A' : 'L'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* --- BOTTOM ACTIONS --- */}
                    <div className="mt-12 bg-white p-8 rounded-[45px] shadow-2xl border-4 border-white flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="text-slate-900 text-sm font-black uppercase tracking-widest flex items-center gap-3">
                            <ShieldAlert className="text-blue-700" size={24} /> Total Headcount: {students.length}
                        </div>
                        {!isLocked ? (
                            <div className="flex flex-wrap justify-center gap-4 w-full md:w-auto">
                                {metaData.status !== 'new' && (
                                    <button onClick={() => handleAction('delete')} disabled={isSubmitting} className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white border-2 border-red-100 transition-all flex items-center gap-2">
                                        <Trash2 size={18} /> Wipe Records
                                    </button>
                                )}
                                <button onClick={() => handleAction('save')} disabled={isSubmitting} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl">
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Draft
                                </button>
                                <button onClick={() => handleAction('finalize')} disabled={isSubmitting} className="px-12 py-4 bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center gap-2 border-b-4 border-blue-900 active:border-b-0">
                                    <Lock size={18} /> Finalize & Lock
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 px-10 py-5 bg-green-50 rounded-3xl border-2 border-green-200 shadow-inner">
                                <CheckCircle2 size={28} className="text-green-600" />
                                <span className="text-sm font-black text-green-800 uppercase tracking-[2px]">Records Finalized & Secure</span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="py-40 text-center flex flex-col items-center gap-6 border-4 border-dashed border-slate-200 rounded-[50px] bg-white">
                    <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-300"><BookOpen size={48} /></div>
                    <p className="text-slate-900 font-black uppercase text-sm tracking-[4px]">Initiate Registry by Selecting Class</p>
                </div>
            )}
        </div>
    );
}