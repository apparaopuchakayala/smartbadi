import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Download, Upload, Save, Loader2,
    FileSpreadsheet, User, BookOpen, Calendar,
    CheckCircle2, AlertCircle, Award, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CardSkeleton, TableSkeleton } from '../../components/common/skeletoncomp';

export function TeacherMarksEntry() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
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
        try {
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
        } finally {
            setLoading(false);
        }
    };

    const saveMarks = async () => {
        setLoading(true);
        const loadToast = toast.loading("Updating academic registry...");
        try {
            const marksData = Object.entries(marks).map(([studentId, obtained]) => ({
                school_id: profile?.school_id,
                exam_config_id: selectedExam.id,
                student_id: studentId,
                obtained_marks: obtained,
                is_passed: obtained >= selectedExam.pass_marks,
                is_uploaded: true
            }));

            const { error } = await supabase.from('student_marks').upsert(marksData, { onConflict: 'exam_config_id,student_id' });
            if (!error) toast.success("Registry Updated Successfully!", { id: loadToast });
            else throw error;
        } catch (err) {
            toast.error("Error saving marks", { id: loadToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-3 md:p-8 space-y-6 md:space-y-10 text-left font-poppins bg-[#F8FAFC] min-h-screen pb-24 transition-all">
            
            {/* --- HEADER --- */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-5 md:p-10 rounded-[35px] md:rounded-[45px] shadow-xl border-2 border-white gap-6">
                <div className="flex items-center gap-4 md:gap-6 text-left">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl border-4 border-white shrink-0">
                        <Award size={24} className="md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                            Student <span className="text-blue-700">Marks Upload</span>
                        </h1>
                        <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[2px] mt-1 md:mt-2">
                             Academic Performance Hub
                        </p>
                    </div>
                </div>
                {selectedExam && (
                    <div className="flex flex-row gap-3 w-full lg:w-auto">
                        <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-4 bg-slate-50 text-slate-700 rounded-xl md:rounded-[22px] font-black text-[10px] uppercase border-2 border-slate-100 hover:bg-slate-200 transition-all shadow-sm whitespace-nowrap active:scale-95">
                            <Download size={16} /> Template
                        </button>
                        <label className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-8 py-3 md:py-4 bg-blue-700 text-white rounded-xl md:rounded-[22px] font-black text-[10px] uppercase cursor-pointer hover:bg-slate-900 transition-all shadow-2xl whitespace-nowrap active:scale-95">
                            <Upload size={16} /> Import
                            <input type="file" className="hidden" accept=".xlsx, .xls" />
                        </label>
                    </div>
                )}
            </header>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
                
                {/* --- SIDEBAR: Fixed Horizontal Width & Added Gutter Padding --- */}
                <div className="lg:col-span-3 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-250px)] pb-4 lg:pb-4 no-scrollbar lg:px-4 custom-scrollbar sticky top-0 md:top-8 z-20">
                    
                    <h3 className="hidden lg:flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-[3px] ml-2 mb-2 sticky top-0 bg-[#F8FAFC] py-2 z-10">
                        <Calendar size={14} className="text-blue-700"/> Assigned Modules
                    </h3>

                    {loading && exams.length === 0 ? (
                        [1, 2, 3, 4, 5].map(i => <CardSkeleton key={i} />)
                    ) : (
                        exams.map(exam => (
                            <button 
                                key={exam.id} 
                                onClick={() => handleExamSelect(exam)}
                                className={`min-w-[260px] lg:min-w-0 w-full p-4 md:p-5 rounded-[22px] text-left transition-all border-4 shrink-0 relative overflow-hidden group ${
                                    selectedExam?.id === exam.id 
                                    ? 'bg-white border-blue-700 shadow-2xl scale-[1.02]' 
                                    : 'bg-white border-transparent text-slate-400 shadow-md hover:border-slate-200'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${selectedExam?.id === exam.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        Grade : {exam.current_class}
                                    </span>
                                    <CheckCircle2 size={16} className={selectedExam?.id === exam.id ? "text-blue-700" : "text-slate-200"} />
                                </div>
                                <h4 className={`font-black text-xs uppercase tracking-tight leading-tight mb-3 ${selectedExam?.id === exam.id ? 'text-slate-900' : 'text-slate-600'}`}>
                                    {exam.exams.exam_name}
                                </h4>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 px-2 py-1 rounded-lg w-fit">
                                        <BookOpen size={12} /> {exam.class_subjects.subject_name}
                                    </div>
                                    <ChevronRight size={14} className={`transition-transform duration-300 ${selectedExam?.id === exam.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`} />
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* --- MAIN TABLE AREA --- */}
                <div className="lg:col-span-9 bg-white rounded-[35px] md:rounded-[50px] shadow-2xl border-4 border-white flex flex-col overflow-hidden transition-all">
                    {loading && selectedExam ? (
                        <div className="p-8"><TableSkeleton /></div>
                    ) : selectedExam ? (
                        <>
                            <div className="bg-slate-900 px-6 md:px-10 py-5 md:py-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-blue-500 rounded-full" />
                                    <h3 className="text-white text-[11px] md:text-[13px] font-black uppercase tracking-[3px]">Score Entry Registry</h3>
                                </div>
                                <div className="text-blue-400 text-[10px] md:text-[11px] font-black uppercase bg-white/10 px-5 py-2 rounded-full border border-white/10 shadow-inner">
                                    Evaluation Weight: {selectedExam.max_marks} Points
                                </div>
                            </div>

                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b-4 border-white text-center">
                                            <th className="px-6 py-6 text-[10px] md:text-[11px] font-black uppercase text-slate-400 border-r-2 border-white">Roll ID</th>
                                            <th className="px-6 py-6 text-[10px] md:text-[11px] font-black uppercase text-slate-400 text-left border-r-2 border-white">Student Name</th>
                                            <th className="px-6 py-6 text-[10px] md:text-[11px] font-black uppercase text-slate-400 border-r-2 border-white">Earned Score</th>
                                            <th className="px-6 py-6 text-[10px] md:text-[11px] font-black uppercase text-slate-400">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y-4 divide-white">
                                        {students.map(student => (
                                            <tr key={student.id} className="hover:bg-blue-50/30 transition-all group">
                                                <td className="px-6 py-5 md:py-7 font-black text-slate-900 text-center border-r-2 border-white bg-slate-50/30">
                                                    #{student.roll_number || '---'}
                                                </td>
                                                <td className="px-6 py-5 md:py-7 border-r-2 border-white">
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className="w-10 h-10 bg-blue-700 text-white rounded-xl flex items-center justify-center font-black border-2 border-white shadow-lg">
                                                            {student.full_name?.[0]}
                                                        </div>
                                                        <span className="font-black text-slate-900 uppercase text-xs md:text-sm truncate max-w-[150px]">{student.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 md:py-7 text-center border-r-2 border-white">
                                                    <input 
                                                        type="number" 
                                                        max={selectedExam.max_marks}
                                                        value={marks[student.id] || ''}
                                                        onChange={(e) => setMarks({ ...marks, [student.id]: parseInt(e.target.value) })}
                                                        className="w-20 md:w-24 p-3 bg-slate-100 border-2 border-transparent rounded-2xl text-center font-black text-sm md:text-xl text-slate-900 outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner appearance-none" 
                                                    />
                                                </td>
                                                <td className="px-6 py-5 md:py-7 text-center">
                                                    <div className="flex justify-center">
                                                        {marks[student.id] >= selectedExam.pass_marks ? (
                                                            <div className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase shadow-lg shadow-emerald-100">
                                                                <CheckCircle2 size={12} /> Passed
                                                            </div>
                                                        ) : (
                                                            <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[9px] font-black uppercase shadow-lg ${marks[student.id] !== undefined ? 'bg-red-500 text-white shadow-red-100' : 'bg-slate-100 text-slate-400'}`}>
                                                                {marks[student.id] !== undefined ? <AlertCircle size={12} /> : null}
                                                                {marks[student.id] !== undefined ? 'Failed' : 'Pending'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-8 md:p-12 bg-slate-50 border-t-4 border-white flex justify-center">
                                <button 
                                    onClick={saveMarks} 
                                    disabled={loading} 
                                    className="w-full max-w-lg py-5 md:py-6 bg-slate-900 text-white rounded-[25px] md:rounded-[35px] font-black uppercase text-sm tracking-[3px] shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />} 
                                    Upload Marks
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="h-[500px] flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-8">
                            <div className="p-10 bg-blue-50 rounded-[40px] border-4 border-white shadow-2xl animate-bounce">
                                <FileSpreadsheet size={64} className="text-blue-300 md:w-20 md:h-20" />
                            </div>
                            <div className="max-w-xs space-y-3">
                                <p className="font-black uppercase text-xl text-slate-900 tracking-tighter">Registry Standby</p>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                                    Select an assigned module to begin academic score processing.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}