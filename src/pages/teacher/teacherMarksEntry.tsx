import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Download, Upload, Save, Loader2,
    FileSpreadsheet, User, BookOpen, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
        if (!error) toast.success("Marks Saved Successfully!");
        else toast.error("Error saving marks");
        setLoading(false);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 text-left font-poppins">
            {/* Header - Stack on Mobile, Row on Desktop */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b pb-6 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase">
                        Marks <span className="text-blue-600">Entry</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Portal Control Panel</p>
                </div>
                {selectedExam && (
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-200 transition-all">
                            <Download size={14} /> Download Template
                        </button>
                        <label className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-[10px] uppercase cursor-pointer hover:bg-blue-100 transition-all">
                            <Upload size={14} /> Bulk Upload
                            <input type="file" className="hidden" accept=".xlsx, .xls" />
                        </label>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                {/* Sidebar - Horizontal Scroll on Mobile, Vertical on Desktop */}
                <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                    <h3 className="hidden lg:block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Exams</h3>
                    {exams.map(exam => (
                        <button key={exam.id} onClick={() => handleExamSelect(exam)}
                            className={`min-w-[200px] lg:min-w-full p-4 md:p-5 rounded-[20px] md:rounded-[25px] text-left transition-all border ${selectedExam?.id === exam.id ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-200 text-slate-600'}`}>
                            <p className="text-[9px] font-bold opacity-60 uppercase">{exam.current_class}</p>
                            <h4 className="font-black text-xs md:text-sm uppercase truncate">{exam.exams.exam_name}</h4>
                            <div className="mt-2 flex items-center gap-2 text-[9px] font-bold">
                                <BookOpen size={12} /> {exam.class_subjects.subject_name}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Marks Entry Table Container */}
                <div className="lg:col-span-3 bg-white rounded-[30px] md:rounded-[40px] shadow-sm border border-slate-200 flex flex-col">
                    {selectedExam ? (
                        <>
                            {/* Horizontal scroll enabled for small screens */}
                            <div className="overflow-x-auto rounded-t-[40px]">
                                <table className="w-full min-w-[600px] text-center border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-[10px] font-black uppercase text-slate-500">
                                            <th className="px-4 py-6">Roll No</th>
                                            <th className="px-4 py-6">Student Name</th>
                                            <th className="px-4 py-6 text-center">Marks ({selectedExam.max_marks})</th>
                                            <th className="px-4 py-6 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students.map(student => (
                                            <tr key={student.id} className="hover:bg-blue-50/30 transition-all">
                                                <td className="px-4 py-5 font-bold text-slate-400">
                                                    {student.roll_number || '---'}
                                                </td>
                                                <td className="px-4 py-5 font-black text-slate-700 uppercase">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <User size={16} className="text-slate-300 shrink-0" />
                                                        <span className="truncate max-w-[150px]">{student.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <input 
                                                        type="number" 
                                                        value={marks[student.id] || ''}
                                                        onChange={(e) => setMarks({ ...marks, [student.id]: parseInt(e.target.value) })}
                                                        className="w-20 mx-auto block p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-black outline-none focus:ring-2 ring-blue-500/20 transition-all" 
                                                    />
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    {marks[student.id] >= selectedExam.pass_marks ? (
                                                        <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-black uppercase border border-green-100">Pass</span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-red-50 text-red-500 rounded-full text-[9px] font-black uppercase border border-red-100">Fail</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Action Button */}
                            <div className="p-6 md:p-10 bg-slate-50/50 rounded-b-[40px] flex justify-center">
                                <button 
                                    onClick={saveMarks} 
                                    disabled={loading} 
                                    className="w-full max-w-md py-4 md:py-5 bg-blue-600 text-white rounded-[20px] md:rounded-[30px] font-black uppercase tracking-[2px] md:tracking-[4px] shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />} 
                                    Update Registry
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="h-[400px] md:h-[500px] flex flex-col items-center justify-center text-slate-300 space-y-4 p-6 text-center">
                            <div className="p-6 bg-slate-50 rounded-full">
                                <FileSpreadsheet size={48} strokeWidth={1.5} className="text-slate-200" />
                            </div>
                            <div>
                                <p className="font-black uppercase text-xs tracking-widest text-slate-400">Idle State</p>
                                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">Select an assignment to begin grading</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}