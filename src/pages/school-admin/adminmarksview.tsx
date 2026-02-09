import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    CheckCircle2, Clock, Search, Send, BookOpen,
    BarChart3, Printer, Share2, StopCircle,
    Download, Filter, User, X, GraduationCap, Loader2,
    ChevronDown, Check, FileSpreadsheet, LayoutDashboard, Grid,
    Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { ReportCardTemplate } from '../../components/common/ReportCardTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

export function AdminMarksView() {
    const { profile } = useAuth();

    // --- STATE ---
    const [loading, setLoading] = useState(true);
    const [allConfigs, setAllConfigs] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
    const [schoolSignature, setSchoolSignature] = useState<string | null>(null);
    const [batchStudents, setBatchStudents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDistributing, setIsDistributing] = useState(false);
    const [classStudents, setClassStudents] = useState<any[]>([]);
    const [queueIndex, setQueueIndex] = useState(-1);
    const [successCount, setSuccessCount] = useState(0);
    const [failCount, setFailCount] = useState(0);
    const [currentStudentForPdf, setCurrentStudentForPdf] = useState<any>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // --- EFFECTS ---
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `SmartBadi_Report_Registry`,
        onAfterPrint: () => { setBatchStudents([]); setIsGenerating(false); }
    });

    useEffect(() => {
        if (profile?.school_id) {
            fetchMarksRegistry();
            fetchSignatureBlob();
        }
    }, [profile]);

    useEffect(() => {
        if (batchStudents.length > 0 && isGenerating && !isDistributing) {
            const timer = setTimeout(() => handlePrint(), 1500);
            return () => clearTimeout(timer);
        }
    }, [batchStudents, isGenerating]);

    useEffect(() => {
        if (isDistributing && queueIndex >= 0 && queueIndex < classStudents.length) {
            processQueueItem(classStudents[queueIndex]);
        } else if (isDistributing && queueIndex >= classStudents.length) {
            setIsDistributing(false);
            setQueueIndex(-1);
            toast.success(`Distribution Complete! Sent: ${successCount}`, { duration: 5000 });
        }
    }, [queueIndex, isDistributing]);

    // --- LOGIC ---
    const processQueueItem = async (student: any) => {
        try {
            setCurrentStudentForPdf(student);
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 3000));
            const element = reportRef.current;
            if (!element) throw new Error("Template not ready");
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, logging: false, width: 794, height: 1123, windowWidth: 1600, x: 0, y: 0, scrollX: 0, scrollY: 0, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            const pdfDataUri = pdf.output('datauristring');
            const rawBase64 = pdfDataUri.split(',')[1];
            const response = await fetch('http://localhost:3001/send-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students: [student], schoolName: profile?.schools?.name, examName: student.marks?.[0]?.exam_name || 'Term Exam', pdfBase64: rawBase64 })
            });
            if (!response.ok) throw new Error("Server Error");
            setSuccessCount(prev => prev + 1);
        } catch (error) { setFailCount(prev => prev + 1); } finally { setQueueIndex(prev => prev + 1); }
    };

    const handleDownloadExcel = async (configId: string, subjectName: string, examName: string) => {
        try {
            toast.loading("Fetching data...");
            const { data, error } = await supabase.from('student_marks').select(`obtained_marks, is_passed, profiles (full_name, roll_number, gender)`).eq('exam_config_id', configId).eq('school_id', profile?.school_id);
            if (error) throw error;
            if (!data || data.length === 0) { toast.dismiss(); toast.error("No marks found."); return; }
            const excelData = data.map((item: any) => ({ "Roll No": item.profiles?.roll_number, "Student Name": item.profiles?.full_name, "Gender": item.profiles?.gender, "Marks Obtained": item.obtained_marks, "Status": item.is_passed ? "PASS" : "FAIL" }));
            const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Marks"); const fileName = `${selectedClass}_${subjectName}_${examName}.xlsx`.replace(/\s+/g, '_'); XLSX.writeFile(wb, fileName);
            toast.dismiss(); toast.success("Downloaded!");
        } catch (err) { console.error(err); toast.dismiss(); toast.error("Download Failed"); }
    };

    const handleDownloadMasterExcel = async () => {
        try {
            if (!selectedClass) { toast.error("Select a grade first"); return; }
            toast.loading("Generating Master Sheet...");

            // Fetch Data
            const groupedData = await fetchClassData();
            const students: any[] = Object.values(groupedData);

            if (students.length === 0) {
                toast.dismiss();
                toast.error("No data available.");
                return;
            }

            // Sort by Roll Number
            students.sort((a, b) => (a.profiles.roll_number || 0) - (b.profiles.roll_number || 0));

            // Flatten Data
            const excelRows = students.map((s) => {
                // Base Info
                const row: any = {
                    "Roll No": s.profiles.roll_number,
                    "Student Name": s.profiles.full_name,
                    "Gender": s.profiles.gender,
                    "Father Name": s.profiles.father_name
                };

                // Dynamic Columns: Separating Max and Obtained
                s.marks.forEach((m: any) => {
                    // Column 1: Max Marks
                    const maxColName = `${m.subject_name} (${m.exam_name}) - Max`;
                    row[maxColName] = m.max_marks;

                    // Column 2: Obtained Marks
                    const obtColName = `${m.subject_name} (${m.exam_name}) - Obtained`;
                    row[obtColName] = m.obtained_marks;
                });

                return row;
            });

            // Create Sheet
            const ws = XLSX.utils.json_to_sheet(excelRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `Class ${selectedClass} Master`);

            // Download
            XLSX.writeFile(wb, `Master_Gradebook_Class_${selectedClass}.xlsx`);

            toast.dismiss();
            toast.success("Master Sheet Downloaded!");

        } catch (err) {
            console.error(err);
            toast.dismiss();
            toast.error("Failed to generate master sheet");
        }
    };

    const fetchSignatureBlob = async () => {
        try {
            const { data } = await supabase
                .from('schools')
                .select('principal_signature_url')
                .eq('id', profile?.school_id)
                .single();
            if (data?.principal_signature_url) {
                const { data: file } = supabase.storage
                    .from('student-photos')
                    .getPublicUrl(data.principal_signature_url);
                setSchoolSignature(file.publicUrl);
            }
        } catch (e) { console.error(e); }
    };
    const fetchMarksRegistry = async () => {
        setLoading(true);
        try {
            const { data: configs } = await supabase
                .from('exam_configurations')
                .select(`id, current_class, current_section, max_marks, pass_marks, exams(exam_name), class_subjects(subject_name)`)
                .eq('school_id', profile?.school_id);
            const { data: marks } = await supabase
                .from('student_marks')
                .select('exam_config_id, is_uploaded');

            const reportData = configs?.map(config => {
                const marksForThis = marks?.filter(m => m.exam_config_id === config.id) || [];
                const isDone = marksForThis.length > 0 && marksForThis.every(m => m.is_uploaded);
                return { ...config, status: isDone ? 'COMPLETED' : (marksForThis.length > 0 ? 'PENDING' : 'NOT_STARTED') };
            });
            setAllConfigs(reportData || []);
        } finally { setLoading(false); }
    };
    const fetchClassData = async () => {
        const { data, error } = await supabase
            .from('student_marks')
            .select(`obtained_marks, profiles!inner(id, full_name, roll_number, current_class, current_section, gender, dob, father_name, father_mobile, avatar_url), exam_configurations!inner(max_marks, class_subjects(subject_name), exams(exam_name))`)
            .eq('profiles.current_class', selectedClass)
            .eq('school_id', profile?.school_id);
        if (error) throw error;
        return data.reduce((acc: any, curr: any) => {
            const sId = curr.profiles.id;
            if (!acc[sId]) acc[sId] = { profiles: curr.profiles, marks: [] };
            acc[sId].marks.push({ subject_name: curr.exam_configurations.class_subjects.subject_name, exam_name: curr.exam_configurations.exams.exam_name, obtained_marks: curr.obtained_marks, max_marks: curr.exam_configurations.max_marks });
            return acc;
        },
            {});
    };
    const handleWhatsAppBroadcast = async () => {
        if (!selectedClass) return;
        try {
            const grouped = await fetchClassData();
            const list = Object.values(grouped);
            if (list.length === 0) {
                toast.error("No students found.");
                return;
            }
            if (!confirm(`Start WhatsApp Broadcast for ${list.length} students?`))
                return;
            setClassStudents(list);
            setSuccessCount(0);
            setFailCount(0);
            setQueueIndex(0);
            setIsDistributing(true);
        }
        catch (err: any) {
            toast.error("Failed to fetch data");
        }
    };
    const handleBulkDownload = async () => {
        setIsGenerating(true);
        try {
            const grouped = await fetchClassData();
            setBatchStudents(Object.values(grouped));
        } catch (err) {
            setIsGenerating(false);
        }
    };
    const openIndividualHub = async () => {
        setIsGenerating(true);
        try {
            const grouped = await fetchClassData();
            setBatchStudents(Object.values(grouped));
            setIsModalOpen(true);
        }
        catch (err) {
            setIsGenerating(false);
        }
    };
    const printSingle = (studentData: any) => {
        setIsGenerating(true);
        setBatchStudents([studentData]);
    };

    const filteredData = selectedClass ? allConfigs.filter(item => item.current_class === selectedClass && item.class_subjects.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) && (filter === 'ALL' ? true : filter === 'PENDING' ? item.status !== 'COMPLETED' : item.status === 'COMPLETED')) : [];
    const targetConfigs = allConfigs.filter(item => item.current_class === selectedClass);
    const totalSubjects = targetConfigs.length;
    const completedSubjects = targetConfigs.filter(item => item.status === 'COMPLETED').length;
    const isClassReady = selectedClass && totalSubjects > 0 && completedSubjects === totalSubjects;
    const classes = Array.from(new Set(allConfigs.map(c => c.current_class))).sort();

    return (
        // Added max-w-full and overflow-visible to handle dropdowns and layout
        <div className="bg-white rounded-[2rem] md:rounded-[40px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] border border-slate-200/60 overflow-visible relative group transition-all duration-500 z-30 w-full max-w-full">

            {/* --- HEADER SECTION --- */}
            <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 text-white overflow-visible shrink-0 z-20 rounded-[2rem] md:rounded-[40px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none rounded-[40px] overflow-hidden"></div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg shrink-0">
                            <BarChart3 size={24} className="text-blue-300 md:w-7 md:h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">Master Gradebook</h2>
                            <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Review & Send Reports</p>
                        </div>
                    </div>

                    {/* --- CUSTOM PREMIUM DROPDOWN --- */}
                    <div className="relative w-full lg:w-64" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full flex items-center justify-between px-5 py-4 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-2xl text-white transition-all shadow-lg group active:scale-95 ring-1 ring-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <Filter size={16} className="text-blue-300" />
                                <span className="text-sm font-bold uppercase tracking-wide truncate">
                                    {selectedClass ? `Grade ${selectedClass}` : "Select Grade"}
                                </span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`text-white/70 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 py-2 max-h-64 overflow-y-auto ring-1 ring-black/5"
                                >
                                    <div className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                                        Available Classes
                                    </div>
                                    {classes.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => {
                                                setSelectedClass(c);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm font-bold transition-colors ${selectedClass === c ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <span>Grade {c}</span>
                                            {selectedClass === c && <Check size={16} className="text-blue-600" />}
                                        </button>
                                    ))}
                                    {classes.length === 0 && (
                                        <div className="px-4 py-3 text-sm text-slate-400 text-center italic">No classes found</div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Actions Row (Wrapped for responsiveness) */}
                <AnimatePresence>
                    {isClassReady && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="flex flex-col sm:flex-row flex-wrap gap-3 overflow-hidden"
                        >
                            <button onClick={handleDownloadMasterExcel} disabled={isGenerating || isDistributing} className="flex-1 py-3 px-4 bg-white hover:bg-emerald-50 text-slate-900 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 active:scale-95 min-w-[140px]">
                                <FileSpreadsheet size={16} className="text-emerald-600" />
                                <span className="whitespace-nowrap">Master Excel</span>
                            </button>

                            <button onClick={handleBulkDownload} disabled={isGenerating || isDistributing} className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 active:scale-95 min-w-[140px]">
                                {isGenerating && !isDistributing ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                                <span className="whitespace-nowrap">Generate PDF</span>
                            </button>

                            <button onClick={handleWhatsAppBroadcast} disabled={isGenerating || isDistributing} className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 active:scale-95 min-w-[140px]">
                                <Share2 size={16} />
                                <span className="whitespace-nowrap">WhatsApp All</span>
                            </button>

                            <button onClick={openIndividualHub} disabled={isGenerating || isDistributing} className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all border border-white/10 disabled:opacity-50 active:scale-95 min-w-[140px]">
                                <User size={16} />
                                <span className="whitespace-nowrap">Individual</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- BODY SECTION (Collapsible) --- */}
            <AnimatePresence>
                {selectedClass && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50/50 border-t border-slate-100 rounded-b-[40px]"
                    >
                        <div className="p-4 md:p-6 space-y-6">

                            {/* Stats Row - Responsive Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                <MiniStat icon={<BookOpen size={16} />} label="Subjects" value={totalSubjects} color="blue" />
                                <MiniStat icon={<CheckCircle2 size={16} />} label="Completed" value={completedSubjects} color="emerald" />
                                <MiniStat icon={<Clock size={16} />} label="Pending" value={totalSubjects - completedSubjects} color="orange" />
                            </div>

                            {/* Data Table - Overflow handling for small screens */}
                            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead className="bg-slate-50/80 border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Class</th>
                                                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Subject & Exam</th>
                                                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Status</th>
                                                <th className="px-4 md:px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Download</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredData.map((item) => (
                                                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 md:px-6 py-4">
                                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold whitespace-nowrap">{item.current_class}-{item.current_section}</span>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4">
                                                        <p className="font-bold text-slate-800 text-xs md:text-sm">{item.class_subjects.subject_name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{item.exams.exam_name}</p>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-center">
                                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                            {item.status === 'COMPLETED' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                            {item.status}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 md:px-6 py-4 text-right">
                                                        {item.status !== 'NOT_STARTED' && (
                                                            <button
                                                                onClick={() => handleDownloadExcel(item.id, item.class_subjects.subject_name, item.exams.exam_name)}
                                                                className="p-2 bg-white border border-slate-200 text-emerald-600 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm flex items-center gap-2 ml-auto"
                                                                title="Download Excel"
                                                            >
                                                                <span className="text-[10px] font-bold uppercase hidden md:hidden lg:inline-block">Excel</span>
                                                                <FileSpreadsheet size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- GHOST & OVERLAYS --- */}
            <div style={{ position: 'fixed', top: 0, left: 0, zIndex: isDistributing ? 50 : -9999, width: '100vw', height: '100vh', overflow: 'auto', background: isDistributing ? 'rgba(0,0,0,0.8)' : 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center', visibility: isDistributing ? 'visible' : 'hidden' }}>
                {currentStudentForPdf && (
                    <div ref={reportRef} className="shadow-2xl origin-center" style={{ minWidth: '794px', width: '794px', minHeight: '1123px', height: '1123px', background: 'white', transform: 'scale(0.8)' }}>
                        <ReportCardTemplate student={currentStudentForPdf.profiles} marks={currentStudentForPdf.marks} schoolInfo={profile?.schools} signatureUrl={schoolSignature} />
                    </div>
                )}
            </div>

            {isDistributing && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-4">
                    <div className="text-center w-full max-w-sm">
                        <Loader2 className="animate-spin w-16 h-16 text-blue-500 mx-auto mb-6" />
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">Broadcasting Reports</h2>
                        <p className="text-blue-300 font-bold mt-2 mb-8">Processing {queueIndex + 1} of {classStudents.length}</p>
                        <button onClick={() => setIsDistributing(false)} className="px-8 py-3 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white rounded-full font-bold transition-all border border-red-500/50 flex items-center justify-center gap-2 mx-auto w-full md:w-auto">
                            <StopCircle size={18} /> Cancel Process
                        </button>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden relative">

                        {/* --- Header --- */}
                        <div className="bg-white border-b border-slate-100 px-6 py-5 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Users size={20} />
                                    </div>
                                    Student Directory
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 pl-12">
                                    Grade {selectedClass} • {batchStudents.length} Students
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* --- Table-Like List --- */}
                        <div className="overflow-y-auto bg-slate-50/50 flex-grow p-4 space-y-2">
                            {batchStudents.length > 0 ? (
                                batchStudents.map((s: any) => (
                                    <div
                                        key={s.profiles.id}
                                        className="group bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                                    >
                                        {/* Avatar & ID Section */}
                                        <div className="flex items-center gap-4 w-full sm:w-auto min-w-[140px]">
                                            {/* Avatar (Initial) instead of Long Number */}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-black text-sm border border-white shadow-sm shrink-0">
                                                {s.profiles.full_name?.charAt(0) || 'S'}
                                            </div>

                                            {/* Roll No Badge */}
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Roll No</span>
                                                <span className="font-mono text-sm font-bold text-slate-700 tracking-tight">
                                                    {s.profiles.roll_number || 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Student Details */}
                                        <div className="flex-1 min-w-0 border-l border-slate-100 pl-0 sm:pl-4 border-l-0 sm:border-l">
                                            <h4 className="font-bold text-slate-900 text-base truncate">
                                                {s.profiles.full_name}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.profiles.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {s.profiles.gender || '-'}
                                                </span>
                                                <span className="truncate max-w-[150px] sm:max-w-xs">
                                                    Parent: <span className="text-slate-700">{s.profiles.father_name || 'N/A'}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50 mt-1 sm:mt-0">
                                            <button
                                                onClick={() => printSingle(s)}
                                                className="flex-1 sm:flex-none h-9 px-4 bg-white border border-slate-200 text-slate-600 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all flex items-center justify-center gap-2 shadow-sm group/btn"
                                                title="Print"
                                            >
                                                <Printer size={16} />
                                                <span className="text-xs font-bold sm:hidden">Print</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setBatchStudents([]);
                                                    setClassStudents([s]);
                                                    setQueueIndex(0);
                                                    setIsDistributing(true);
                                                }}
                                                className="flex-1 sm:flex-none h-9 px-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 shadow-sm"
                                                title="WhatsApp"
                                            >
                                                <Share2 size={16} />
                                                <span className="text-xs font-bold sm:hidden">Send</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <div className="w-16 h-16 bg-white rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
                                        <Users size={24} className="opacity-40" />
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-widest opacity-60">No students found</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-white px-6 py-3 border-t border-slate-100 text-[10px] text-slate-400 font-bold flex justify-between items-center">
                            <span>Admin Console</span>
                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">Ready</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---
const MiniStat = ({ icon, label, value, color }: any) => {
    const colors: any = { blue: "bg-blue-50 text-blue-600", emerald: "bg-emerald-50 text-emerald-600", orange: "bg-orange-50 text-orange-600" };
    return (
        <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className={`p-2 rounded-xl mb-2 ${colors[color]}`}>{icon}</div>
            <p className="text-xl md:text-2xl font-black text-slate-800 leading-none">{value}</p>
            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
    );
};