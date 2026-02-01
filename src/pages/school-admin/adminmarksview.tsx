import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
    CheckCircle2, Clock, Search, Send, BookOpen,
    BarChart3, Printer, Share2, StopCircle,
    Download, Filter, User, X, GraduationCap, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { ReportCardTemplate } from '../../components/common/ReportCardTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function AdminMarksView() {
    const { profile } = useAuth();
    
    // --- DATA STATES ---
    const [loading, setLoading] = useState(true);
    const [allConfigs, setAllConfigs] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
    const [schoolSignature, setSchoolSignature] = useState<string | null>(null);

    // --- UI STATES ---
    const [batchStudents, setBatchStudents] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // --- QUEUE SYSTEM STATES ---
    const [isGenerating, setIsGenerating] = useState(false); 
    const [isDistributing, setIsDistributing] = useState(false); 
    const [classStudents, setClassStudents] = useState<any[]>([]); 
    const [queueIndex, setQueueIndex] = useState(-1);
    const [successCount, setSuccessCount] = useState(0);
    const [failCount, setFailCount] = useState(0);
    const [currentStudentForPdf, setCurrentStudentForPdf] = useState<any>(null);

    const reportRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `SmartBadi_Report_Registry`,
        onAfterPrint: () => {
            setBatchStudents([]);
            setIsGenerating(false);
        }
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

    // --- 3. FIX: PRECISE A4 PDF GENERATION ---
    const processQueueItem = async (student: any) => {
        try {
            setCurrentStudentForPdf(student);

            // Wait for React to render and images to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            const element = reportRef.current;
            if (!element) throw new Error("Template not ready");

            // A4 Dimensions in Pixels (96 DPI standard)
            const A4_WIDTH_PX = 794;
            const A4_HEIGHT_PX = 1123;

            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                useCORS: true,
                logging: false,
                width: A4_WIDTH_PX,  
                height: A4_HEIGHT_PX,
                windowWidth: A4_WIDTH_PX, 
                windowHeight: A4_HEIGHT_PX,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: '#ffffff'
            });

            // A4 Dimensions in mm for jsPDF
            const A4_WIDTH_MM = 210;
            const A4_HEIGHT_MM = 297;

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Map pixels to mm exactly
            pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
            
            const pdfDataUri = pdf.output('datauristring');
            const rawBase64 = pdfDataUri.split(',')[1];

            const response = await fetch('http://localhost:3001/send-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    students: [student],
                    schoolName: profile?.schools?.name,
                    examName: student.marks?.[0]?.exam_name || 'Term Exam',
                    pdfBase64: rawBase64
                })
            });

            if (!response.ok) throw new Error("Server Error");
            setSuccessCount(prev => prev + 1);

        } catch (error) {
            console.error(`Failed: ${student.profiles.full_name}`, error);
            setFailCount(prev => prev + 1);
        } finally {
            setQueueIndex(prev => prev + 1);
        }
    };

    // --- DATA FETCHING (Same as before) ---
    const fetchSignatureBlob = async () => {
        try {
            const { data } = await supabase.from('schools').select('principal_signature_url').eq('id', profile?.school_id).single();
            if (data?.principal_signature_url) {
                const { data: file } = supabase.storage.from('student-photos').getPublicUrl(data.principal_signature_url);
                try {
                    const res = await fetch(file.publicUrl);
                    const blob = await res.blob();
                    setSchoolSignature(URL.createObjectURL(blob));
                } catch { setSchoolSignature(file.publicUrl); }
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
            const { data: marks } = await supabase.from('student_marks').select('exam_config_id, is_uploaded');
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
            .select(`
                obtained_marks, 
                profiles!inner(id, full_name, roll_number, current_class, current_section, gender, dob, father_name, father_mobile, avatar_url), 
                exam_configurations!inner(max_marks, class_subjects(subject_name), exams(exam_name))
            `)
            .eq('profiles.current_class', selectedClass)
            .eq('school_id', profile?.school_id);
        if (error) throw error;
        return data.reduce((acc: any, curr: any) => {
            const sId = curr.profiles.id;
            if (!acc[sId]) acc[sId] = { profiles: curr.profiles, marks: [] };
            acc[sId].marks.push({
                subject_name: curr.exam_configurations.class_subjects.subject_name,
                exam_name: curr.exam_configurations.exams.exam_name,
                obtained_marks: curr.obtained_marks,
                max_marks: curr.exam_configurations.max_marks
            });
            return acc;
        }, {});
    };

    // --- BUTTON HANDLERS ---
    const handleWhatsAppBroadcast = async () => {
        if (!selectedClass) return;
        try {
            const grouped = await fetchClassData();
            const list = Object.values(grouped);
            if (list.length === 0) { toast.error("No students found."); return; }
            if (!confirm(`Start WhatsApp Broadcast for ${list.length} students?`)) return;
            setClassStudents(list);
            setSuccessCount(0);
            setFailCount(0);
            setQueueIndex(0);
            setIsDistributing(true);
        } catch (err: any) { toast.error("Failed to fetch data"); }
    };

    const handleBulkDownload = async () => {
        setIsGenerating(true);
        try {
            const grouped = await fetchClassData();
            setBatchStudents(Object.values(grouped));
        } catch (err) { setIsGenerating(false); }
    };

    const openIndividualHub = async () => {
        setIsGenerating(true);
        try {
            const grouped = await fetchClassData();
            setBatchStudents(Object.values(grouped));
            setIsModalOpen(true);
        } catch (err) { setIsGenerating(false); }
    };

    const printSingle = (studentData: any) => {
        setIsGenerating(true);
        setBatchStudents([studentData]);
    };

    const filteredData = selectedClass ? allConfigs.filter(item =>
        item.current_class === selectedClass &&
        item.class_subjects.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filter === 'ALL' ? true : filter === 'PENDING' ? item.status !== 'COMPLETED' : item.status === 'COMPLETED')
    ) : [];

    const targetConfigs = allConfigs.filter(item => item.current_class === selectedClass);
    const totalSubjects = targetConfigs.length;
    const completedSubjects = targetConfigs.filter(item => item.status === 'COMPLETED').length;
    const isClassReady = selectedClass && totalSubjects > 0 && completedSubjects === totalSubjects;
    const classes = Array.from(new Set(allConfigs.map(c => c.current_class))).sort();

    return (
        <div className="bg-white rounded-2xl md:rounded-[40px] p-3 md:p-10 shadow-sm border border-slate-200 space-y-4 md:space-y-6 relative overflow-hidden">

            {/* --- FIX: HIDDEN CONTAINER --- */}
            <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0,
                zIndex: -50,
                // EXACT A4 PIXEL DIMENSIONS
                width: '794px',  
                height: '1123px', 
                background: 'white',
                pointerEvents: 'none',
                opacity: 0,
                overflow: 'hidden'
            }}>
                {currentStudentForPdf && (
                    <div ref={reportRef} className="origin-top-left">
                        <ReportCardTemplate
                            student={currentStudentForPdf.profiles}
                            marks={currentStudentForPdf.marks}
                            schoolInfo={profile?.schools}
                            signatureUrl={schoolSignature}
                        />
                    </div>
                )}
            </div>

            {/* Case B: Physical Bulk Print (List) */}
            {!isDistributing && (
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    <div ref={reportRef}>
                        {batchStudents.map((s: any, index: number) => (
                            <div key={index} style={{ backgroundColor: 'white', marginBottom: '20px', pageBreakAfter: 'always' }}>
                                <ReportCardTemplate
                                    student={s.profiles}
                                    marks={s.marks}
                                    schoolInfo={profile?.schools}
                                    signatureUrl={schoolSignature}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- DISTRIBUTION OVERLAY --- */}
            {isDistributing && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <div className="w-96 text-center space-y-8 animate-in zoom-in duration-300">
                        <Loader2 className="animate-spin w-16 h-16 text-blue-500 mx-auto" />
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-widest">Sending Reports</h2>
                            <p className="text-blue-300 font-bold mt-2">Processing {queueIndex + 1} of {classStudents.length}</p>
                            {currentStudentForPdf && (
                                <p className="text-sm opacity-60 mt-1">To: {currentStudentForPdf.profiles.full_name}</p>
                            )}
                        </div>
                        <div className="flex justify-center gap-8 text-lg font-bold">
                            <span className="text-emerald-400">Success: {successCount}</span>
                            <span className="text-red-400">Failed: {failCount}</span>
                        </div>
                        <button onClick={() => setIsDistributing(false)} className="bg-white/10 hover:bg-red-500 px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 mx-auto">
                            <StopCircle size={18} /> Stop
                        </button>
                    </div>
                </div>
            )}

            {/* --- REST OF UI --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-4 md:p-8 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">Student Hub</h3>
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Class {selectedClass}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white/10 hover:bg-red-500 rounded-xl transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-3 md:p-6 overflow-y-auto space-y-3 bg-slate-50 flex-grow">
                            {batchStudents.map((s: any) => (
                                <div key={s.profiles.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 gap-3 group">
                                    <div className="flex items-center gap-3 md:gap-5">
                                        <div className="shrink-0 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">
                                            {s.profiles.roll_number.toString().slice(-2)}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-slate-800 uppercase text-xs md:text-sm">{s.profiles.full_name}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{s.profiles.father_name || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 justify-end">
                                        <button onClick={() => printSingle(s)} className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Printer size={16} /></button>
                                        <button 
                                            onClick={() => {
                                                setBatchStudents([]);
                                                setClassStudents([s]);
                                                setQueueIndex(0);
                                                setSuccessCount(0);
                                                setIsDistributing(true);
                                            }}
                                            className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                        >
                                            <Share2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-4 bg-slate-900 p-5 md:p-8 rounded-2xl md:rounded-[35px] shadow-2xl">
                <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-blue-600 text-white rounded-xl"><BarChart3 size={20} /></div>
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter">Marks Registry</h1>
                        <p className="text-[8px] md:text-[10px] font-bold text-blue-400 uppercase tracking-widest">Audit & Distribution</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-3 w-full">
                    <div className="relative flex-1 text-left">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white/10 text-white border border-white/10 rounded-xl text-[10px] md:text-xs font-black uppercase outline-none focus:ring-2 ring-blue-500"
                        >
                            <option value="" className="text-slate-900">Select Grade</option>
                            {classes.map(c => <option key={c} value={c} className="text-slate-900">Grade {c}</option>)}
                        </select>
                    </div>

                    {isClassReady && (
                        <div className="col-span-1 sm:col-span-2 flex flex-wrap gap-2 animate-in zoom-in duration-300">
                            <button onClick={handleBulkDownload} disabled={isGenerating || isDistributing} className="flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">
                                {isGenerating && !isDistributing ? <Loader2 className="animate-spin" size={14}/> : <Download size={14} />} Generate PDF
                            </button>
                            <button onClick={handleWhatsAppBroadcast} disabled={isGenerating || isDistributing} className="flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all">
                                <Share2 size={14} /> WhatsApp All
                            </button>
                            <button onClick={openIndividualHub} disabled={isGenerating || isDistributing} className="flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">
                                <User size={14} /> Individual
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {selectedClass ? (
                <div className="space-y-4 md:space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatBox icon={<BookOpen size={16} />} title="Subjects" value={totalSubjects} color="blue" />
                        <StatBox icon={<CheckCircle2 size={16} />} title="Uploaded" value={completedSubjects} color="green" />
                        <StatBox icon={<Clock size={16} />} title="Pending" value={totalSubjects - completedSubjects} color="orange" />
                        <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100 flex flex-col justify-center gap-2">
                            <div className="flex justify-between items-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase">Readiness</p>
                                <p className="text-[10px] font-black text-blue-600">{(completedSubjects / totalSubjects * 100).toFixed(0)}%</p>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(completedSubjects / totalSubjects * 100)}%` }} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl md:rounded-[35px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse min-w-[500px]">
                                <thead className="bg-slate-50 border-b border-slate-100 font-black uppercase text-[8px] md:text-[10px] text-slate-400">
                                    <tr>
                                        <th className="px-4 py-4">Target</th>
                                        <th className="px-4 py-4 text-left">Subject & Exam</th>
                                        <th className="px-4 py-4">Status</th>
                                        <th className="px-4 py-4">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-left">
                                    {filteredData.map((item) => (
                                        <tr key={item.id} className="group hover:bg-blue-50/20 transition-all">
                                            <td className="px-4 py-4 text-center">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-900 rounded-md font-black text-[8px] uppercase">{item.current_class}-{item.current_section}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-black text-slate-800 text-[10px] md:text-xs uppercase">{item.class_subjects.subject_name}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase">{item.exams.exam_name}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase border ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                    {item.status === 'COMPLETED' ? <CheckCircle2 size={10} /> : <Clock size={10} className="animate-pulse" />} {item.status}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {item.status !== 'COMPLETED' && (
                                                    <button onClick={() => toast.success("Notification sent")} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white transition-all shadow-sm"><Send size={14} /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 rounded-[30px] md:rounded-[40px] py-16 md:py-32 flex flex-col items-center justify-center text-center px-6 border-2 border-dashed border-slate-200">
                    <div className="p-4 md:p-6 bg-white rounded-full shadow-lg mb-6 text-slate-300">
                        <GraduationCap size={40} className="md:w-16 md:h-16" />
                    </div>
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-400">Class Selection Required</h3>
                    <p className="text-[10px] md:text-sm font-bold text-slate-400 uppercase mt-2 max-w-sm">
                        Please select a Grade from the dropdown to start the academic audit and generate reports.
                    </p>
                </div>
            )}
        </div>
    );
}

const StatBox = ({ icon, title, value, color }: any) => {
    const colorMap = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", orange: "bg-orange-50 text-orange-600" };
    return (
        <div className="bg-white p-3 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2 md:gap-3 text-left">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${colorMap[color as keyof typeof colorMap]}`}>{icon}</div>
            <div>
                <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{title}</p>
                <p className="text-sm md:text-xl font-black text-slate-800 leading-none">{value}</p>
            </div>
        </div>
    );
};