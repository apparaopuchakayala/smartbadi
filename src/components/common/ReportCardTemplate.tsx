import React from 'react';
import { ShieldCheck, Star, User, Quote } from 'lucide-react';

export const ReportCardTemplate = React.forwardRef(({ student, marks, schoolInfo, signatureUrl }: any, ref: any) => {

    if (!student) {
        return null;
    }

    const calculateGrade = (obtained: number, max: number) => {
        const pct = max > 0 ? (obtained / max) * 100 : 0;
        if (pct >= 90) return 'A+';
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B+';
        if (pct >= 60) return 'B';
        if (pct >= 50) return 'C+';
        if (pct >= 40) return 'C';
        return 'F';
    };

    const getGradeColor = (grade: string) => {
        if (grade === 'F') return 'text-red-600 bg-red-50';
        if (grade.includes('A')) return 'text-emerald-700 bg-emerald-50';
        return 'text-slate-700 bg-slate-100';
    };

    // --- 2. Aggregates ---
    const totalMax = marks.reduce((acc: number, curr: any) => acc + (Number(curr.max_marks) || 0), 0);
    const totalObtained = marks.reduce((acc: number, curr: any) => acc + (Number(curr.obtained_marks) || 0), 0);
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "0";
    const overallGrade = calculateGrade(totalObtained, totalMax);
    const examDisplayName = marks[0]?.exam_name || "Academic Evaluation";

    return (
        <>
            {/* --- FORCE PRINT STYLES --- */}
            <style type="text/css" media="print">
                {`
                    @page { size: A4; margin: 0; }
                    body { margin: 0; -webkit-print-color-adjust: exact; }
                `}
            </style>

            <div
                ref={ref}
                // Use MM for A4 precision (210mm x 297mm) instead of PX
                style={{
                    width: '210mm',
                    minWidth: '210mm',
                    height: '297mm',
                    minHeight: '297mm',
                    backgroundColor: 'white',
                    fontFamily: 'poppins',
                    margin: '0 auto', // Centers it in the browser preview
                    boxSizing: 'border-box'
                }}
                className="relative flex flex-col overflow-hidden text-slate-900 bg-white shadow-none print:shadow-none print:m-0"
            >
                {/* --- WATERMARK BACKGROUND --- */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none z-0">
                    <ShieldCheck size={500} />
                </div>

                {/* --- DECORATIVE BORDER --- */}
                <div className="absolute inset-0 border-[10px] border-slate-900 pointer-events-none z-50"></div>
                <div className="absolute inset-3 border-[1px] border-slate-300 pointer-events-none z-50"></div>

                {/* === HEADER SECTION === */}
                <div className="bg-slate-900 text-white p-8 pt-12 relative z-10 shrink-0 print:bg-slate-900 print:text-white">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-5">
                            {/* School Logo Placeholder */}
                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-2xl">
                                <Star size={40} fill="currentColor" className="text-yellow-500" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">
                                    {schoolInfo?.name || 'SMARTBADI ACADEMY'}
                                </h1>
                                <p className="text-[10px] font-bold uppercase tracking-[4px] text-slate-400 opacity-80">
                                    {schoolInfo?.location || 'Center for Excellence'}
                                </p>
                                <p className="text-[9px] text-slate-500">Affiliated to State Board of Education</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="inline-block px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Academic Year</p>
                                <p className="text-md font-black text-white tracking-widest">2026-2027</p>
                            </div>
                        </div>
                    </div>

                    {/* Exam Title Badge */}
                    <div className="absolute -bottom-5  right-10 bg-blue-600 text-white px-8 py-2.5 rounded-xl shadow-lg border-4 border-white print:bg-blue-600 print:text-white">
                        <p className="text-xs font-black uppercase tracking-[3px] mb-0">{examDisplayName}</p>
                    </div>
                </div>

                {/* === BODY CONTENT === */}
                <div className="flex-1 flex flex-col p-10 pt-12 relative z-10">

                    {/* --- STUDENT PROFILE CARD --- */}
                    <div className="flex gap-8 mb-8 h-36 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm print:bg-slate-50">
                        {/* Profile Picture */}
                        <div className="w-28 h-28 bg-white border-4 border-white rounded-xl flex flex-col items-center justify-center text-slate-300 shadow-md overflow-hidden shrink-0">
                            {student.avatar_url ? (
                                <img
                                    src={student.avatar_url}
                                    alt="Student"
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <>
                                    <User size={32} />
                                    <span className="text-[7px] font-black uppercase mt-1 tracking-widest">No Photo</span>
                                </>
                            )}
                        </div>

                        {/* Student Details Grid */}
                        <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-2 content-center text-xs">
                            <div className="border-b border-slate-200 pb-1">
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Student Name</p>
                                <p className="text-lg font-black text-slate-900 uppercase truncate">{student.full_name}</p>
                            </div>
                            <div className="border-b border-slate-200 pb-1">
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Roll Number</p>
                                <p className="text-base font-bold text-slate-700">{student.roll_number}</p>
                            </div>
                            <div className="border-b border-slate-200 pb-1">
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Class / Section</p>
                                <p className="text-base font-bold text-slate-700">{student.current_class} - {student.current_section}</p>
                            </div>
                            <div className="border-b border-slate-200 pb-1">
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Father    </p>
                                <p className="text-base font-bold text-slate-700 uppercase">{student.father_name || '---'}</p>
                            </div>
                        </div>

                        {/* Overall Grade Widget */}
                        <div className="w-28 h-28 rounded-full border-[6px] border-white shadow-lg bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center text-white shrink-0 print:bg-blue-700">
                            <span className="text-5xl font-black tracking-tighter leading-none">{overallGrade}</span>
                            <span className="text-[7px] font-bold uppercase opacity-80 mt-1">Final Grade</span>
                        </div>
                    </div>

                    {/* --- MARKS TABLE --- */}
                    <div className="flex-1 mb-6 overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-900 text-white h-10 print:bg-slate-900 print:text-white">
                                    <th className="px-6 text-left font-black uppercase tracking-widest text-[9px]">Subject</th>
                                    <th className="px-6 text-center font-black uppercase tracking-widest text-[9px]">Max Marks</th>
                                    <th className="px-6 text-center font-black uppercase tracking-widest text-[9px]">Obtained</th>
                                    <th className="px-6 text-center font-black uppercase tracking-widest text-[9px]">Percentage</th>
                                    <th className="px-6 text-center font-black uppercase tracking-widest text-[9px]">Grade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {marks.map((m: any, idx: number) => {
                                    const max = Number(m.max_marks) || 100;
                                    const obt = Number(m.obtained_marks) || 0;
                                    const pct = max > 0 ? (obt / max) * 100 : 0;
                                    const grade = calculateGrade(obt, max);

                                    return (
                                        <tr key={idx} className="h-11 even:bg-slate-50/50 print:even:bg-slate-100">
                                            <td className="px-6 font-bold text-slate-700 uppercase">{m.subject_name}</td>
                                            <td className="px-6 text-center text-slate-500 font-bold">{max}</td>
                                            <td className="px-6 text-center font-black text-slate-900 text-sm">{obt}</td>
                                            <td className="px-6 text-center text-slate-500 font-medium">{pct.toFixed(0)}%</td>
                                            <td className="px-6 text-center">
                                                <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase border ${getGradeColor(grade)} print:border-slate-300`}>
                                                    {grade}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* --- TOTAL SUMMARY BAR --- */}
                    <div className="flex justify-end gap-0 mb-8 shrink-0">
                        <div className="bg-slate-900 text-white px-8 py-3 rounded-l-xl flex items-center gap-6 print:bg-slate-900">
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase opacity-60 tracking-widest">Grand Total</p>
                                <p className="text-2xl font-black leading-none">{totalObtained} <span className="text-sm opacity-50">/ {totalMax}</span></p>
                            </div>
                        </div>
                        <div className="bg-blue-600 text-white px-8 py-3 rounded-r-xl flex flex-col justify-center items-center min-w-[100px] print:bg-blue-600">
                            <p className="text-2xl font-black leading-none">{percentage}%</p>
                            <p className="text-[8px] font-bold uppercase opacity-80 mt-1">Aggregate</p>
                        </div>
                    </div>

                    {/* --- FOOTER & SIGNATURE --- */}
                    <div className="mt-auto grid grid-cols-2 gap-20 items-end">

                        {/* Teacher Sign */}
                        <div className="text-center relative">
                            <div className="h-16 flex items-end justify-center mb-2">
                                <Quote size={24} className="text-slate-200 mb-2" />
                            </div>
                            <div className="h-0.5 bg-slate-300 w-40 mx-auto mb-2"></div>
                            <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">Class Teacher</p>
                        </div>

                        {/* Principal Sign */}
                        <div className="text-center relative">
                            <div className="h-16 flex items-end justify-center mb-2 relative">
                                {signatureUrl ? (
                                    <img
                                        src={signatureUrl}
                                        alt="Principal Sign"
                                        className="h-16 object-contain mix-blend-multiply opacity-90 absolute bottom-0"
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <span className="text-[8px] text-slate-300 italic mb-2">Digitally Verified</span>
                                )}
                            </div>
                            <div className="h-0.5 bg-slate-900 w-40 mx-auto mb-2"></div>
                            <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-900">Principal Signature</p>
                        </div>
                    </div>
                </div>

                {/* Footer Meta */}
                <div className="w-full text-center mt-8 border-t border-slate-100 pt-4 absolute bottom-4 left-0">
                    <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">
                        Computer Generated Report • {new Date().toLocaleDateString()} • {schoolInfo?.name}
                    </p>
                </div>
            </div>
        </>
    );
});