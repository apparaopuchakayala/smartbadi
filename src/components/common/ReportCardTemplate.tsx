import React from 'react';
import { ShieldCheck, Award, Star } from 'lucide-react';

export const ReportCardTemplate = React.forwardRef(({ student, marks, schoolInfo, signatureUrl }: any, ref: any) => {
    const totalMax = marks.reduce((acc: number, curr: any) => acc + (Number(curr.max_marks) || 0), 0);
    const totalObtained = marks.reduce((acc: number, curr: any) => acc + (Number(curr.obtained_marks) || 0), 0);
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "0";

    // Extracting the Exam Name from the first mark entry (e.g., Unit Test - 1)
    const examDisplayName = marks[0]?.exam_name || "Academic Evaluation";

    return (
        <div
            ref={ref}
            className="p-8 bg-white border-[12px] border-double border-slate-200 min-h-[1050px] max-w-[800px] mx-auto relative font-serif text-slate-900 overflow-hidden"
            style={{ pageBreakAfter: 'always' }}
        >
            {/* --- WATERMARK --- */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <ShieldCheck size={500} />
            </div>

            {/* --- SCHOOL HEADER --- */}
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-4 relative">
                <div className="absolute left-0 top-0 w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                    <Star size={24} className="text-slate-300" />
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{schoolInfo?.name || 'SMARTBADI ACADEMY'}</h1>
                <p className="text-[9px] font-bold uppercase tracking-[3px] mt-1 text-slate-500">{schoolInfo?.location || 'Education Hub'}</p>

                {/* --- DYNAMIC EXAM NAME --- */}
                <div className="mt-3 inline-block px-8 py-1 bg-slate-900 text-white rounded-full text-[11px] font-black uppercase tracking-[2px]">
                    {examDisplayName} REPORT CARD
                </div>
                <p className="text-[9px] mt-1 font-bold text-slate-400 uppercase tracking-widest italic">Academic Year 2025-26</p>
            </div>

            {/* --- STUDENT PROFILE --- */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-[11px] bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-1.5 text-left">
                    <p><span className="font-black uppercase w-24 inline-block text-slate-400">Name</span> : <span className="text-slate-900 font-black uppercase">{student.full_name}</span></p>
                    <p><span className="font-black uppercase w-24 inline-block text-slate-400">Roll No</span> : <span className="font-bold">#{student.roll_number}</span></p>
                    <p><span className="font-black uppercase w-24 inline-block text-slate-400">Gender / DOB</span> : <span className="font-bold uppercase">{student.gender || 'M'} / {student.dob || '01-01-2015'}</span></p>
                </div>
                <div className="space-y-1.5 text-right">
                    <p><span className="font-black uppercase w-24 inline-block text-slate-400">Class</span> : <span className="font-bold">{student.current_class} - {student.current_section}</span></p>
                    <p><span className="font-black uppercase w-24 inline-block text-slate-400">Attendance</span> : <span className="font-bold text-emerald-600">94%</span></p>
                    <p><span className="font-black uppercase w-24 inline-block text-slate-400">Issue Date</span> : <span className="font-bold">{new Date().toLocaleDateString()}</span></p>
                </div>
            </div>

            {/* --- PERFORMANCE TABLE --- */}
            <div className="min-h-[450px]">
                <table className="w-full border-collapse border-[3px] border-slate-900 mb-6 text-xs shadow-lg">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="border border-slate-700 p-2.5 text-left font-black uppercase tracking-widest">Subject Name</th>
                            <th className="border border-slate-700 p-2.5 text-center font-black uppercase tracking-widest">Max</th>
                            <th className="border border-slate-700 p-2.5 text-center font-black uppercase tracking-widest">Obtained</th>
                            <th className="border border-slate-700 p-2.5 text-center font-black uppercase tracking-widest">Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {marks.map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="border border-slate-900 p-2.5 text-left font-bold uppercase text-slate-800">{m.subject_name}</td>
                                <td className="border border-slate-900 p-2.5 text-center font-bold">{m.max_marks}</td>
                                <td className="border border-slate-900 p-2.5 text-center font-black text-blue-700">{m.obtained_marks}</td>
                                <td className="border border-slate-900 p-2.5 text-center font-black">
                                    {m.obtained_marks >= (m.max_marks * 0.9) ? 'A+' :
                                        m.obtained_marks >= (m.max_marks * 0.75) ? 'A' :
                                            m.obtained_marks >= (m.max_marks * 0.35) ? 'B' : 'F'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-100 font-black border-t-[3px] border-slate-900">
                            <td className="border border-slate-900 p-2.5 uppercase text-left">Total Aggregate</td>
                            <td className="border border-slate-900 p-2.5 text-center">{totalMax}</td>
                            <td className="border border-slate-900 p-2.5 text-center text-indigo-700">{totalObtained}</td>
                            <td className="border border-slate-900 p-2.5 text-center text-indigo-700">{percentage}%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* --- REMARKS SECTION --- */}
            <div className="mb-10 p-4 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Teacher Remarks:</p>
                <p className="text-xs italic text-slate-600 font-serif">Excellent performance. Keep maintaining the same consistency in core subjects.</p>
            </div>

            {/* --- SIGNATURES --- */}
            <div className="absolute bottom-12 left-8 right-8 flex justify-between items-end">

                <div className="text-center">
                    <div className="w-32 border-b border-slate-900 mb-1"></div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Class Teacher</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <div className="p-2 border-2 border-double border-blue-50 rounded-full bg-blue-50/20">
                        <Award size={36} className="text-blue-200" />
                    </div>
                    <p className="text-[6px] font-black uppercase text-blue-400 tracking-[2px]">Verified {schoolInfo?.name}</p>
                </div>
                <div className="text-center flex flex-col items-center justify-end">
                    {signatureUrl ? (
                        <img
                            src={signatureUrl}
                            alt="Principal Signature"
                            className="h-12 w-auto mb-1 object-contain opacity-90"
                            crossOrigin="anonymous" // Important for canvas generation
                        />
                    ) : (
                        // Fallback height to keep alignment if no signature
                        <div className="h-12 mb-1 flex items-end justify-center">
                            <span className="text-[8px] text-slate-300 italic">No Digital Sign</span>
                        </div>
                    )}
                    <div className="w-40 border-b border-slate-900 mb-1"></div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-900">{schoolInfo?.name || 'SmartBadi Academy'}</p>
                </div>
            </div>
        </div>
    );
});