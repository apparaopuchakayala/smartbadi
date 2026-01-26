import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Download, Upload, Save, Loader2,
    FileSpreadsheet, User, BookOpen, Calendar,
    CheckCircle2, AlertCircle, Award
} from 'lucide-react';
import toast from 'react-hot-toast';

export function TeacherMarksEntry() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [marks, setMarks] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (profile?.id) fetchTeacherExams();
    }, [profile]);

    const fetchTeacherExams = async () => {
        setLoading(true);
        try {
            const { data: assignments } = await supabase
                .from('teacher_assignments')
                .select('class_name, subject_name')
                .eq('teacher_id', profile?.id);

            if (!assignments || assignments.length === 0) return;

            const { data: configs } = await supabase
                .from('exam_configurations')
                .select(`
                    id, max_marks, pass_marks, exam_date, current_class,
                    exams ( exam_name ),
                    class_subjects ( subject_name )
                `)
                .in('current_class', assignments.map(a => a.class_name))
                .eq('school_id', profile?.school_id);

            setExams(configs || []);
        } finally {
            setLoading(false);
        }
    };

    const handleExamSelect = async (examConfig: any) => {
        setSelectedExam(examConfig);
        setLoading(true);
        const { data: studentsList } = await supabase
            .from('profiles')
            .select('id, full_name, roll_number')
            .eq('current_class', examConfig.current_class)
            .eq('role', 'student')
            .order('roll_number');

        setStudents(studentsList || []);

        const { data: existingMarks } = await supabase
            .from('student_marks')
            .select('student_id, obtained_marks')
            .eq('exam_config_id', examConfig.id);

        const marksMap: any = {};
        existingMarks?.forEach(m => marksMap[m.student_id] = m.obtained_marks);
        setMarks(marksMap);
        setLoading(false);
    };

    const saveMarks = async () => {
        setLoading(true);
        const marksData = Object.entries(marks).map(([studentId, obtained]) => ({
            school_id: profile?.school_id,
            exam_config_id: selectedExam.id,
            student_id: studentId,
            obtained_marks: obtained,
            is_passed: obtained >= selectedExam.pass_marks,
            is_uploaded: true
        }));

        const { error } = await supabase.from('student_marks').upsert(marksData, { onConflict: 'exam_config_id,student_id' });
        if (!error) toast.success("Registry Updated Successfully!");
        else toast.error("Error saving marks");
        setLoading(false);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-10 text-left font-poppins bg-[#F8FAFC] min-h-screen pb-20">

            {/* --- HEADER: High Contrast --- */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 md:p-10 rounded-[35px] shadow-lg border-2 border-blue-100 gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white shrink-0">
                        <Award size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">
                            Marks <span className="text-[#8DC63F]">Inventory</span>
                        </h1>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[3px] mt-2 flex items-center gap-2">
                            upload student marks
                        </p>
                    </div>
                </div>
                {selectedExam && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-slate-100 text-slate-800 rounded-2xl font-black text-[10px] uppercase border-2 border-slate-200 hover:bg-slate-200 transition-all shadow-sm">
                            <Download size={16} /> download Template
                        </button>
                        <label className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-4 bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase cursor-pointer hover:bg-slate-900 transition-all shadow-xl">
                            <Upload size={16} /> Import Data
                            <input type="file" className="hidden" accept=".xlsx, .xls" />
                        </label>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* --- SIDEBAR: High Visibility List --- */}
                <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
                    <h3 className="hidden lg:flex items-center gap-2 text-[11px] font-black uppercase text-slate-900 tracking-widest ml-2 mb-2">
                        <Calendar size={14} className="text-blue-600" /> Available Exams
                    </h3>
                    {exams.map(exam => (
                        <button key={exam.id} onClick={() => handleExamSelect(exam)}
                            className={`min-w-[220px] lg:min-w-full p-6 rounded-[28px] text-left transition-all border-4 ${selectedExam?.id === exam.id ? 'bg-white border-blue-600 shadow-2xl scale-105' : 'bg-white border-transparent text-slate-500 shadow-sm opacity-80 hover:opacity-100 hover:border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedExam?.id === exam.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {exam.current_class}
                                </span>
                                <CheckCircle2 size={16} className={selectedExam?.id === exam.id ? "text-blue-600" : "text-slate-200"} />
                            </div>
                            <h4 className={`font-black text-sm uppercase tracking-tight leading-tight ${selectedExam?.id === exam.id ? 'text-slate-900' : 'text-slate-700'}`}>
                                {exam.exams.exam_name}
                            </h4>
                            <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-blue-500">
                                <BookOpen size={14} /> {exam.class_subjects.subject_name.toUpperCase()}
                            </div>
                        </button>
                    ))}
                </div>

                {/* --- MAIN TABLE: Ultra High Contrast --- */}
                <div className="lg:col-span-3 bg-white rounded-[40px] shadow-2xl border-2 border-slate-200 flex flex-col overflow-hidden">
                    {selectedExam ? (
                        <>
                            <div className="bg-slate-900 px-8 py-5 flex justify-between items-center">
                                <h3 className="text-white text-[11px] font-black uppercase tracking-[2px]">Student List & Score Entry</h3>
                                <div className="text-blue-400 text-[11px] font-black uppercase bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                                    Target: {selectedExam.max_marks} Marks
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                                            <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-900 text-center border-r">Roll Number</th>
                                            <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-900 text-left">Student Name</th>
                                            <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-900 text-center">Score Input</th>
                                            <th className="px-8 py-6 text-[11px] font-black uppercase text-slate-900 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-100">
                                        {students.map(student => (
                                            <tr key={student.id} className="hover:bg-blue-50/50 transition-all group">
                                                <td className="px-8 py-6 font-black text-slate-900 text-center border-r bg-slate-50/30 group-hover:bg-white transition-colors">
                                                    #{student.roll_number || '---'}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-blue-700 text-white rounded-xl flex items-center justify-center font-black text-sm border-2 border-white shadow-md">
                                                            {student.full_name?.[0]}
                                                        </div>
                                                        <span className="font-black text-slate-900 uppercase text-sm tracking-tight">{student.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="relative w-24 mx-auto">
                                                        <input
                                                            type="number"
                                                            max={selectedExam.max_marks}
                                                            value={marks[student.id] || ''}
                                                            onChange={(e) => setMarks({ ...marks, [student.id]: parseInt(e.target.value) })}
                                                            className="w-full p-3 bg-white border-4 border-slate-200 rounded-2xl text-center font-black text-lg text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    {marks[student.id] >= selectedExam.pass_marks ? (
                                                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-full text-[10px] font-black uppercase shadow-lg shadow-green-100">
                                                            <Award size={12} /> Passed
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase shadow-lg shadow-red-100">
                                                            <AlertCircle size={12} /> Failed
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* --- ACTION BUTTON: Sticky Bottom --- */}
                            <div className="p-8 md:p-12 bg-slate-50 border-t-2 border-slate-200 flex justify-center">
                                <button
                                    onClick={saveMarks}
                                    disabled={loading}
                                    className="w-full max-w-lg py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase text-sm tracking-[4px] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-4 group"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={22} className="group-hover:scale-125 transition-transform" />}
                                    Update Performance Registry
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 p-10 text-center space-y-6">
                            <div className="p-8 bg-blue-50 rounded-full border-4 border-white shadow-xl">
                                <FileSpreadsheet size={64} className="text-blue-300" />
                            </div>
                            <div className="max-w-xs">
                                <p className="font-black uppercase text-lg text-slate-900 tracking-tighter">Awaiting Selection</p>
                                <p className="text-[11px] font-bold text-slate-400 uppercase mt-2 leading-relaxed">
                                    Select an active examination module from the sidebar to initialize the marks registry.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}