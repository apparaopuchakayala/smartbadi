import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    Download, Upload, Save, Loader2,
    FileSpreadsheet, Award, Calendar,
    CheckCircle2, BookOpen, ChevronRight, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx'; 
import { CardSkeleton, TableSkeleton } from '../../components/common/skeletoncomp';

export function TeacherMarksEntry() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    
    // Data States
    const [exams, setExams] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState<any>(null); // This holds the ACTIVE exam
    const [students, setStudents] = useState<any[]>([]);
    const [marks, setMarks] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (profile?.id) fetchTeacherExams();
    }, [profile]);

    // --- 1. FETCH EXAMS ---
    const fetchTeacherExams = async () => {
        setLoading(true);
        try {
            const { data: assignments } = await supabase
                .from('teacher_assignments')
                .select('class_id, subject_id, subject_name')
                .eq('teacher_id', profile?.id);

            if (!assignments || assignments.length === 0) {
                setExams([]);
                return;
            }

            const assignedClassIds = assignments.map(a => a.class_id);

            const { data: configs } = await supabase
                .from('exam_configurations')
                .select(`
                    id, class_id, subject_id, max_marks, pass_marks, exam_date, current_class,
                    exams ( exam_name ),
                    class_subjects ( subject_name )
                `)
                .in('class_id', assignedClassIds)
                .eq('school_id', profile?.school_id);

            if (configs) {
                const filteredExams = configs.filter(exam => {
                    const examSubjectName = exam.class_subjects?.subject_name;
                    return assignments.some(assignment => {
                        const isClassMatch = assignment.class_id === exam.class_id;
                        const isIdMatch = assignment.subject_id && exam.subject_id && (assignment.subject_id === exam.subject_id);
                        const isNameMatch = assignment.subject_name === examSubjectName;
                        return isClassMatch && (isIdMatch || isNameMatch);
                    });
                });
                setExams(filteredExams);
            } else {
                setExams([]);
            }
        } catch (error) {
            console.error("Error fetching exams:", error);
            toast.error("Failed to load assigned exams");
        } finally {
            setLoading(false);
        }
    };

    // --- 2. HANDLE EXAM SELECTION ---
    const handleExamSelect = async (examConfig: any) => {
        setSelectedExam(examConfig); // <--- Sets the state here
        setLoading(true);
        try {
            // Priority: Fetch by ID
            let query = supabase
                .from('profiles')
                .select('id, full_name, roll_number')
                .eq('role', 'student')
                .order('roll_number');

            if (examConfig.class_id) {
                query = query.eq('class_id', examConfig.class_id);
            } else {
                query = query.eq('current_class', examConfig.current_class);
            }

            const { data: studentsList } = await query;
            setStudents(studentsList || []);

            // Marks
            const { data: existingMarks } = await supabase
                .from('student_marks')
                .select('student_id, obtained_marks')
                .eq('exam_config_id', examConfig.id);

            const marksMap: any = {};
            existingMarks?.forEach(m => marksMap[m.student_id] = m.obtained_marks);
            setMarks(marksMap);

        } catch (error) {
            console.error("Error loading students:", error);
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    // --- 3. DOWNLOAD EXCEL TEMPLATE (FIXED) ---
    const downloadTemplate = () => {
        // Debugging Logs
        // console.log("Selected Exam:", selectedExam);
        // console.log("Students Count:", students.length);

        if (!selectedExam) {
            return toast.error("Please select a module from the left sidebar first.");
        }

        if (students.length === 0) {
            return toast.error("No students found in this class. Cannot generate template.");
        }

        const templateData = students.map(s => ({
            "Roll Number": s.roll_number || '---',
            "Student Name": s.full_name,
            "Max Marks": selectedExam.max_marks,
            "Obtained Marks": marks[s.id] || ''
        }));

        const ws = XLSX.utils.json_to_sheet(templateData);
        XLSX.utils.sheet_add_aoa(ws, [[selectedExam.id]], { origin: "Z1" }); // Hidden ID

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Marks Template");
        
        const fileName = `Marks_${selectedExam.current_class}_${selectedExam.class_subjects?.subject_name || 'Subject'}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success("Template Downloaded!");
    };

    // --- 4. IMPORT EXCEL DATA ---
    const handleImport = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!selectedExam) return toast.error("Select a module first!");

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                const hiddenId = ws['Z1']?.v;
                if (hiddenId !== selectedExam.id) {
                    toast.error("Wrong File! Does not match selected exam.");
                    e.target.value = null;
                    return;
                }

                const data: any[] = XLSX.utils.sheet_to_json(ws);
                const updatedMarks = { ...marks };
                let hasError = false;

                data.forEach(row => {
                    const obtained = row["Obtained Marks"];
                    if (obtained !== undefined) {
                        const val = Number(obtained);
                        if (val > selectedExam.max_marks) hasError = true;
                        
                        const student = students.find(s => s.full_name === row["Student Name"]);
                        if (student && !hasError) updatedMarks[student.id] = val;
                    }
                });

                if (hasError) {
                    toast.error(`Marks cannot exceed ${selectedExam.max_marks}`);
                } else {
                    setMarks(updatedMarks);
                    toast.success("Data Imported!");
                }
            } catch (err) {
                toast.error("File error!");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };

    // --- 5. SAVE MARKS ---
    const saveMarks = async () => {
        if (!selectedExam) return;
        setLoading(true);
        const loadToast = toast.loading("Saving...");
        try {
            const marksData = Object.entries(marks).map(([studentId, obtained]) => ({
                school_id: profile?.school_id,
                exam_config_id: selectedExam.id,
                student_id: studentId,
                obtained_marks: obtained,
                is_passed: Number(obtained) >= selectedExam.pass_marks,
                is_uploaded: true
            }));

            if(marksData.length === 0) {
                toast.dismiss(loadToast);
                return toast("No marks to save.");
            }

            const { error } = await supabase.from('student_marks').upsert(marksData, { onConflict: 'exam_config_id,student_id' });
            if (!error) toast.success("Saved!", { id: loadToast });
            else throw error;
        } catch (err) {
            toast.error("Save failed", { id: loadToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-3 md:p-8 space-y-6 md:space-y-10 text-left font-poppins bg-[#F8FAFC] min-h-screen pb-24">
            
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-5 md:p-10 rounded-[35px] shadow-xl border-2 border-white gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                        <Award size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">
                            Marks <span className="text-blue-700">Entry</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teacher Portal</p>
                    </div>
                </div>
                
                {selectedExam && (
                    <div className="flex gap-3">
                        <button onClick={downloadTemplate} className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-200 transition-all active:scale-95">
                            <Download size={16} /> Template
                        </button>
                        <label className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase cursor-pointer hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                            <Upload size={16} /> Import
                            <input type="file" className="hidden" accept=".xlsx" onChange={handleImport} />
                        </label>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Sidebar */}
                <div className="lg:col-span-3 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible pb-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2 hidden lg:block">Assigned Modules</h3>
                    
                    {loading && exams.length === 0 ? [1,2,3].map(i => <CardSkeleton key={i} />) : 
                        exams.map(exam => (
                            <button key={exam.id} onClick={() => handleExamSelect(exam)}
                                className={`p-5 rounded-2xl text-left border-2 transition-all w-full min-w-[200px] relative group ${selectedExam?.id === exam.id ? 'bg-white border-blue-600 shadow-xl scale-[1.02]' : 'bg-white border-transparent hover:border-slate-200'}`}>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-1 rounded text-slate-500">{exam.current_class}</span>
                                    {selectedExam?.id === exam.id && <CheckCircle2 size={16} className="text-blue-600" />}
                                </div>
                                <h4 className="font-black text-slate-800 uppercase text-xs mb-1">{exam.exams.exam_name}</h4>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase">
                                    <BookOpen size={12} /> {exam.class_subjects?.subject_name}
                                </div>
                            </button>
                        ))
                    }
                    
                    {!loading && exams.length === 0 && (
                        <div className="p-6 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-2">
                            <AlertTriangle size={24} className="text-orange-400"/>
                            <p className="text-slate-400 text-[10px] font-bold uppercase">No exams assigned.</p>
                        </div>
                    )}
                </div>

                {/* Right Content */}
                <div className="lg:col-span-9 bg-white rounded-[35px] shadow-xl border-4 border-white overflow-hidden min-h-[500px]">
                    {selectedExam ? (
                        <>
                            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-xs">Students List</h3>
                                    <p className="text-[9px] text-slate-400 uppercase font-bold">{selectedExam.current_class} • {selectedExam.class_subjects?.subject_name}</p>
                                </div>
                                <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-bold">Max: {selectedExam.max_marks}</span>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="py-4 px-6 text-left">Student Info</th>
                                            <th className="py-4 px-6 text-center">Marks Input</th>
                                            <th className="py-4 px-6 text-center">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students.length > 0 ? students.map(std => (
                                            <tr key={std.id} className="hover:bg-slate-50/50">
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-slate-800 text-sm uppercase">{std.full_name}</div>
                                                    <div className="text-[10px] font-bold text-slate-400">Roll: {std.roll_number || '-'}</div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <input type="number" 
                                                        className="w-20 p-2 bg-slate-100 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                                                        value={marks[std.id] || ''}
                                                        max={selectedExam.max_marks}
                                                        onChange={(e) => setMarks({...marks, [std.id]: Number(e.target.value)})}
                                                    />
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    {marks[std.id] >= selectedExam.pass_marks ? 
                                                        <span className="text-emerald-600 text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-full">Pass</span> :
                                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${marks[std.id] !== undefined ? 'text-red-500 bg-red-50' : 'text-slate-300 bg-slate-50'}`}>
                                                            {marks[std.id] !== undefined ? 'Fail' : 'Pending'}
                                                        </span>
                                                    }
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={3} className="p-10 text-center text-slate-400 text-sm font-bold">
                                                    No students found in this class.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                                <button onClick={saveMarks} disabled={loading || students.length === 0} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl active:scale-95 disabled:opacity-50">
                                    {loading ? <Loader2 className="animate-spin inline mr-2" size={16}/> : <Save className="inline mr-2" size={16}/>} Save All Marks
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 min-h-[400px]">
                            <FileSpreadsheet size={48} className="mb-4 opacity-50" />
                            <p className="font-bold text-xs uppercase tracking-widest">Select an exam module to start grading</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}