import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import {
  Trophy, AlertCircle, Printer, CheckCircle2,
  TrendingUp, ChevronRight, XCircle,
  GraduationCap, Sparkles, BookOpen, Star, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { ReportCardTemplate } from '../../components/common/ReportCardTemplate';

export function StudentResults() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [examsList, setExamsList] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [resultData, setResultData] = useState<Record<string, any[]>>({});

  // --- NEW: State for Signature URL ---
  const [schoolSignature, setSchoolSignature] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `${profile?.full_name || 'Student'}_ReportCard`,
    onAfterPrint: () => toast.success("Report downloaded successfully!"),
  });

  useEffect(() => {
    if (profile?.id) {
      fetchStudentResults();
      fetchSchoolSignature(); // <--- Fetch Signature on load
    }
  }, [profile]);

  // --- 1. FETCH SIGNATURE LOGIC ---
  const fetchSchoolSignature = async () => {
    try {
      if (!profile?.school_id) return;

      // A. Get the filename from the schools table
      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('principal_signature_url')
        .eq('id', profile.school_id)
        .single();
      setSchoolSignature(schoolData?.principal_signature_url);

    } catch (err) {
      console.error("Error fetching signature:", err);
    }

  };

  const fetchStudentResults = async () => {
    setLoading(true);
    try {
      // 1. Check Declaration Gatekeeper first
      const { data: declaredList } = await supabase
        .from('result_declarations')
        .select('exam_name')
        .eq('school_id', profile?.school_id)
        .eq('class_name', profile?.current_class)
        .eq('section', profile?.current_section)
        .eq('is_published', true);

      const allowedExams = declaredList?.map(d => d.exam_name) || [];

      if (allowedExams.length === 0) {
        setExamsList([]);
        setLoading(false);
        return;
      }

      // 2. Fetch Marks
      const { data: marks, error } = await supabase
        .from('student_marks')
        .select(`
          obtained_marks,
          is_passed,
          is_uploaded,
          exam_configurations (
            max_marks,
            pass_marks,
            exams ( exam_name ),
            class_subjects ( subject_name, subject_code )
          )
        `)
        .eq('student_id', profile?.id)
        .eq('is_uploaded', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (marks && marks.length > 0) {
        const grouped = marks.reduce((acc: any, curr: any) => {
          const examName = curr.exam_configurations?.exams?.exam_name || 'Unknown Exam';

          // FILTER: Only show declared exams
          if (!allowedExams.includes(examName)) return acc;

          if (!acc[examName]) acc[examName] = [];

          const max = Number(curr.exam_configurations?.max_marks || 100);
          const pass = Number(curr.exam_configurations?.pass_marks || 35);
          const obt = Number(curr.obtained_marks || 0);

          acc[examName].push({
            subject: curr.exam_configurations?.class_subjects?.subject_name || 'Unknown Subject',
            code: curr.exam_configurations?.class_subjects?.subject_code,
            max: max,
            pass: pass,
            obtained: obt,
            percentage: max > 0 ? ((obt / max) * 100).toFixed(0) : '0',
            status: curr.is_passed === true ? 'PASS' : (obt >= pass ? 'PASS' : 'FAIL')
          });
          return acc;
        }, {});

        const examKeys = Object.keys(grouped);
        setExamsList(examKeys);
        setResultData(grouped);
        if (examKeys.length > 0) setSelectedExam(examKeys[0]);
      }
    } catch (err: any) {
      toast.error("Could not load results.");
    } finally {
      setLoading(false);
    }
  };

  const currentResult = selectedExam ? resultData[selectedExam] : [];
  const totalMax = currentResult.reduce((a, b) => a + b.max, 0);
  const totalObtained = currentResult.reduce((a, b) => a + b.obtained, 0);
  const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0';
  const isAllPassed = currentResult.every(r => r.status === 'PASS');

  const getGrade = (pct: number) => {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 40) return 'D';
    return 'F';
  };

  const grade = getGrade(Number(overallPercentage));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 font-poppins text-left bg-[#F8FAFC] min-h-screen">

      {/* 1. ULTRA-PREMIUM HEADER */}
      <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 text-white p-8 md:p-12 rounded-[45px] shadow-[0_20px_50px_-12px_rgba(79,70,229,0.4)] overflow-hidden">

        {/* Animated Background Mesh */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-400/30 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col-reverse lg:flex-row justify-between items-center gap-8 md:gap-12">

          {/* Left Text */}
          <div className="flex-1 space-y-5 text-center lg:text-left w-full">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg mx-auto lg:mx-0">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#34d399]"></div>
              <span className="text-[10px] font-bold uppercase tracking-[3px]">Academic Portal</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-3 drop-shadow-sm">
                Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">Results</span>
              </h1>
              <p className="text-sm md:text-base font-medium text-indigo-100/90 max-w-xl leading-relaxed mx-auto lg:mx-0">
                Welcome to your performance dashboard. Track your grades, analyze subject strength, and access your official academic records.
              </p>
            </div>
          </div>

          {/* RIGHT: PROFILE GLASS CARD */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4 bg-white/10 backdrop-blur-xl p-6 md:p-8 rounded-[40px] border border-white/20 shadow-2xl relative group min-w-[280px]"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-110 group-hover:scale-125 transition-transform duration-500"></div>

              {profile?.avatar_url ? (
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  src={profile.avatar_url}
                  alt="Profile"
                  className="relative w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-[6px] border-white/30 shadow-2xl"
                />
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-white to-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-black text-4xl border-[6px] border-white/30 shadow-2xl"
                >
                  {profile?.full_name?.charAt(0)}
                </motion.div>
              )}

              <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-emerald-500 w-6 h-6 md:w-8 md:h-8 rounded-full border-[4px] border-indigo-900/50 flex items-center justify-center shadow-lg">
                <CheckCircle2 size={12} className="text-white w-3 h-3 md:w-4 md:h-4" />
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white drop-shadow-md">
                {profile?.full_name || 'Student Name'}
              </h3>
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] font-bold bg-black/20 px-3 py-1 rounded-full uppercase border border-white/10 backdrop-blur-sm">
                  Roll No: <span className="text-white">{profile?.roll_number || '---'}</span>
                </span>
                <span className="text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full uppercase border border-white/10 backdrop-blur-sm">
                  Class {profile?.current_class || '---'}
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 animate-pulse">
          <Loader2Icon />
          <p className="mt-4 font-black uppercase tracking-widest text-xs">Loading Academic Data...</p>
        </div>
      ) : examsList.length === 0 ? (
        <div className="py-32 bg-white rounded-[40px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
          <div className="p-6 bg-slate-50 rounded-full mb-4">
            <AlertCircle size={40} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-400">No Records Found</h3>
          <p className="text-xs font-bold uppercase tracking-widest mt-1">Results have not been declared yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* 2. Left Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Exam Selector */}
            <div className="bg-white p-2 rounded-[35px] border border-slate-100 shadow-sm">
              <div className="p-6 pb-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Examination</h3>
              </div>
              <div className="space-y-1 p-2">
                {examsList.map(exam => (
                  <button
                    key={exam}
                    onClick={() => setSelectedExam(exam)}
                    className={`group w-full flex justify-between items-center p-4 rounded-[25px] text-xs font-black uppercase tracking-wide transition-all duration-300 ${selectedExam === exam ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
                  >
                    <span className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${selectedExam === exam ? 'bg-blue-400 animate-pulse' : 'bg-slate-300'}`} />
                      {exam}
                    </span>
                    {selectedExam === exam && <ChevronRight size={16} className="text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Score Card */}
            <AnimatePresence mode="wait">
              {selectedExam && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden transition-all duration-500 ${isAllPassed ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-2 px-4 py-1 bg-black/10 rounded-full backdrop-blur-sm border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-[3px]">Final Grade</p>
                    </div>

                    <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/30 my-4 shadow-inner">
                      <h2 className="text-7xl font-black tracking-tighter drop-shadow-lg">{grade}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full mt-4">
                      <div className="bg-black/10 p-3 rounded-2xl border border-white/5">
                        <p className="text-2xl font-black">{overallPercentage}%</p>
                        <p className="text-[8px] font-bold uppercase opacity-60">Percentage</p>
                      </div>
                      <div className="bg-black/10 p-3 rounded-2xl border border-white/5">
                        <p className="text-2xl font-black">{totalObtained}</p>
                        <p className="text-[8px] font-bold uppercase opacity-60">Total Score</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  <GraduationCap size={180} className="absolute -bottom-10 -left-10 text-black/10 rotate-12" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3. Main Content */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Detailed Report</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedExam}</p>
                </div>
              </div>
              <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:shadow-lg hover:-translate-y-1 transition-all active:scale-95">
                <Printer size={16} /> Download PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {currentResult.map((sub: any, idx: number) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx}
                    className="group relative bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] -mr-4 -mt-4 transition-colors duration-300 ${sub.status === 'PASS' ? 'bg-emerald-50 group-hover:bg-emerald-100' : 'bg-rose-50 group-hover:bg-rose-100'}`} />

                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner border border-black/5 ${sub.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {sub.subject.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-1">{sub.subject}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{sub.code || 'SUB-00'}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${sub.status === 'PASS' ? 'bg-white text-emerald-700 border-emerald-200' : 'bg-white text-rose-700 border-rose-200'}`}>
                          {sub.status}
                        </div>
                      </div>

                      {/* Modern Progress Bar */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-3xl font-black text-slate-900 tracking-tighter">{sub.obtained}<span className="text-xs text-slate-400 font-bold ml-1">/ {sub.max}</span></span>
                          <span className={`text-xs font-black ${sub.status === 'PASS' ? 'text-emerald-500' : 'text-rose-500'}`}>{sub.percentage}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-[2px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${sub.percentage}%` }}
                            transition={{ duration: 1.2, delay: 0.1, ease: "easeOut" }}
                            className={`h-full rounded-full shadow-sm ${sub.status === 'PASS' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-rose-400 to-rose-600'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Printable Template */}
      <div style={{ display: 'none' }}>
        <div ref={reportRef}>
          <ReportCardTemplate
            student={profile}
            marks={currentResult.map((m: any) => ({
              subject_name: m.subject,
              exam_name: selectedExam,
              max_marks: m.max,
              obtained_marks: m.obtained
            }))}
            schoolInfo={profile?.schools}
            signatureUrl={schoolSignature}
          />
        </div>
      </div>

    </div>
  );
}

// Simple Helper for Loading
const Loader2Icon = () => (
  <svg className="animate-spin h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);