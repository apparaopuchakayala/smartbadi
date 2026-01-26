import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Save, Loader2, Lock, Trash2, Filter,
    ToggleLeft, ToggleRight, BookOpen, Calendar,
    Unlock, ShieldAlert, ChevronRight, CheckCircle2,
    History, Fingerprint, Activity, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { StudentProfileModal } from '../../components/common/studentprofilemodal';
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

    const handleAction = async (action: 'save' | 'finalize' | 'delete') => {
        if (!selectedClassId || !profile) return;
        const currentClass = myClasses.find(c => c.id === selectedClassId);
        if (action === 'finalize' && !window.confirm("Finalize & send WhatsApp alerts to absentees?")) return;
        if (action === 'delete' && !window.confirm("Wipe all data?")) return;

        setIsSubmitting(true);
        try {
            if (action === 'delete') {
                await supabase.from('student_attendance').delete().match({
                    class_name: currentClass.class_name,
                    section: currentClass.section,
                    subject_name: currentClass.subject_name,
                    date: date
                });
                setAttendanceData({});
                setMetaData({ status: 'new', markedBy: '', markedAt: null });
                toast.success("Records Purged");
            } else {
                const isFinal = action === 'finalize';
                const now = new Date().toISOString();
                const teacherName = profile.full_name || "Teacher";

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
                    marked_by: teacherName,
                    marked_at: now
                }));

                const { error } = await supabase.from('student_attendance').upsert(records, { onConflict: 'student_id, subject_name, date' });
                if (error) throw error;

                if (isFinal) {
                    const absentStudents = students
                        .filter(s => attendanceData[s.id] === 'absent')
                        .map(s => ({
                            name: s.full_name,
                            mobile: s.parent_mobile || s.father_mobile || s.mother_mobile,
                            date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
                            school_name: profile.schools.name || "smart badi"
                        }));

                    if (absentStudents.length > 0) {
                        fetch('http://localhost:3001/send-absent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ students: absentStudents })
                        });
                    }
                }

                setMetaData({ status: isFinal ? 'finalized' : 'saved', markedBy: teacherName, markedAt: now });
                toast.success(isFinal ? "Registry Finalized" : "Progress Saved");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const sortedStudents = [...students].filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
    const absentCount = Object.values(attendanceData).filter(s => s === 'absent').length;
    const isLocked = metaData.status === 'finalized';

    if (pageLoading) return <div className="p-8 max-w-7xl mx-auto"><ControlSkeleton /></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-10 font-poppins bg-[#FAFAFB] min-h-screen transition-all">
            
            <AnimatePresence>
                {viewStudent && <StudentProfileModal student={viewStudent} onClose={() => setViewStudent(null)} />}
            </AnimatePresence>

            {/* --- CLEAN SELECTOR SECTION --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="lg:col-span-2 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Session Target</p>
                    <div className="relative">
                        <select
                            className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                        >
                            <option value="">Choose Class Registry</option>
                            {myClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>
                                    {cls.class_name} {cls.section} — {cls.subject_name.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={18} />
                    </div>
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Date</p>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={date}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setDate(e.target.value)}
                        />
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                </div>
            </div>

            {selectedClassId ? (
                <>
                    {/* --- MINIMAL STATUS BANNER --- */}
                    <div className={`p-8 rounded-[32px] border bg-white transition-all duration-500 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 ${isLocked ? 'border-l-8 border-l-slate-900 border-slate-200' : metaData.status === 'saved' ? 'border-l-8 border-l-amber-400 border-slate-200' : 'border-l-8 border-l-blue-500 border-slate-200'}`}>
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl ${isLocked ? 'bg-slate-50 text-slate-900' : metaData.status === 'saved' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                {isLocked ? <Fingerprint size={32} /> : metaData.status === 'saved' ? <Save size={32} /> : <Activity size={32} className="animate-pulse" />}
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    {metaData.status === 'new' && 'Attendance Not Yet Recorded'}
                                    {metaData.status === 'saved' && 'Attendance Saved (Not Finalized)'}
                                    {metaData.status === 'finalized' && 'Attendance Finalized'}
                                    {isLocked && <CheckCircle2 size={18} className="text-blue-500" />}
                                </h2>
                                <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 uppercase tracking-wide">
                                    <History size={14} className="text-slate-300" />
                                    {metaData.status === 'new' ? (
                                        'Ready for new entry'
                                    ) : (
                                        <span>
                                            {metaData.status === 'finalized' ? 'Finalized' : 'Saved'} by <span className="font-bold text-slate-700">{metaData.markedBy}</span> on {new Date(metaData.markedAt).toLocaleDateString([], { day: '2-digit', month: 'short' })} at {new Date(metaData.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-slate-50 px-6 py-3 rounded-2xl text-center border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Present</p>
                                <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
                            </div>
                            <div className="bg-slate-50 px-6 py-3 rounded-2xl text-center border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Absent</p>
                                <p className="text-2xl font-bold text-red-500">{absentCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* --- CLEAN CONTROLS --- */}
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input
                                placeholder="Find student by name..."
                                className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-all shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => {
                                const newStatus = !isAllAbsent ? 'absent' : 'present';
                                const updatedData = { ...attendanceData };
                                students.forEach(s => updatedData[s.id] = newStatus);
                                setAttendanceData(updatedData);
                                setIsAllAbsent(!isAllAbsent);
                            }}
                            disabled={isLocked}
                            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-bold transition-all ${isAllAbsent ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-800 text-white shadow-md hover:bg-slate-700'} ${isLocked ? 'opacity-30' : ''}`}
                        >
                            {isAllAbsent ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            {isAllAbsent ? 'WIPE ALL' : 'MARK ALL PRESENT'}
                        </button>
                    </div>

                    {/* --- MINIMAL STUDENT LIST --- */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6, 7, 8].map(i => <CardSkeleton key={i} />)
                        ) : (
                            sortedStudents.map((student) => {
                                const status = attendanceData[student.id] || 'present';
                                return (
                                    <motion.div layout key={student.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                        <div className="p-5 flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 cursor-pointer" onClick={() => setViewStudent(student)}>
                                                {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-300 text-xl">{student.full_name.charAt(0)}</div>}
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{student.roll_number || 'No Roll'}</p>
                                                <h4 className="text-sm font-bold text-slate-800 mt-0.5">{student.full_name}</h4>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5 w-full pt-2">
                                                {['present', 'absent', 'late'].map((s) => (
                                                    <button
                                                        key={s}
                                                        disabled={isLocked}
                                                        onClick={() => setAttendanceData({ ...attendanceData, [student.id]: s })}
                                                        className={`py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${attendanceData[student.id] === s ? (s === 'present' ? 'bg-emerald-500 text-white' : s === 'absent' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white') : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                    >
                                                        {s.charAt(0)}
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
                    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-slate-500">
                            <ShieldAlert size={20} className="text-blue-500" />
                            <span className="text-xs font-bold uppercase tracking-wider">Strength Verified: {students.length}</span>
                        </div>
                        
                        {!isLocked ? (
                            <div className="flex flex-wrap justify-center gap-3">
                                {metaData.status !== 'new' && (
                                    <button onClick={() => handleAction('delete')} disabled={isSubmitting} className="px-6 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                                        Delete Attendance
                                    </button>
                                )}
                                <button onClick={() => handleAction('save')} disabled={isSubmitting} className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-2">
                                    {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save Attendance
                                </button>
                                <button onClick={() => handleAction('finalize')} disabled={isSubmitting} className="px-10 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
                                    <Lock size={14} /> Finalize Attendance
                                </button>
                            </div>
                        ) : (
                            <div className="px-8 py-3 bg-slate-900 text-white rounded-2xl flex items-center gap-3">
                                <Fingerprint size={18} className="text-blue-400" />
                                <span className="text-xs font-bold uppercase tracking-widest">Locked by {metaData.markedBy}</span>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="py-32 text-center space-y-6">
                    <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
                        <BookOpen size={40} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-800">Registry Workspace</h3>
                        <p className="text-sm text-slate-400">Select a class from your assigned units to begin</p>
                    </div>
                </div>
            )}
        </div>
    );
}