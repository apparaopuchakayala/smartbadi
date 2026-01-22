import React, { useState } from 'react';
import { smartBadiApi } from '../../services/smartBadiApi.ts';
import { Settings, CheckCircle2, BookOpen, Layers, Save, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export function SchoolSetup({ schoolId }: { schoolId: string }) {
  const [loading, setLoading] = useState(false);
  const classes = Array.from({ length: 10 }, (_, i) => `${i + 1}${getOrdinal(i + 1)} Class`);
  const sections = ['A', 'B', 'C'];
  const tsSubjects = smartBadiApi.getTelanganaSubjects();

  function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  const handleFullSetup = async () => {
    setLoading(true);
    try {
      const classPayload: any[] = [];
      classes.forEach(c => {
        sections.forEach(s => {
          classPayload.push({ class_name: c, section: s });
        });
      });

      await smartBadiApi.setupSchoolStructure(schoolId, classPayload);
      await smartBadiApi.setupSubjects(schoolId, tsSubjects);

      toast.success("School Infrastructure Configured Successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-[40px] shadow-sm border border-slate-50">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
          <Settings size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Master Setup</h2>
          <p className="text-slate-400 text-sm">Configure your school's structural DNA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Classes Info */}
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-3 mb-4 text-blue-600 font-bold uppercase text-[10px] tracking-widest">
            <Layers size={16} /> 10 Classes & 3 Sections
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">
            This will automatically create 30 unique class-section units (1st A to 10th C).
          </p>
        </div>

        {/* Subjects Info */}
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-3 mb-4 text-orange-600 font-bold uppercase text-[10px] tracking-widest">
            <BookOpen size={16} /> Telangana Curriculum
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">
            All state-mandated subjects including 1st & 2nd languages will be mapped.
          </p>
        </div>
      </div>

      <button
        onClick={handleFullSetup}
        disabled={loading}
        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-[3px] text-xs hover:bg-blue-600 transition-all flex items-center justify-center gap-4 shadow-xl disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Deploy Full School Configuration</>}
      </button>
    </div>
  );
}