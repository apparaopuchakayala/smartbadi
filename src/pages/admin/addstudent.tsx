import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from '../../components/sidebar';
import {
  X, Mail, Phone, Calendar as CalendarIcon, Hash, MapPin,
  GraduationCap, User, Users2, Heart, UserCircle, Save,
  RotateCcw, Image as ImageIcon, FileUp, FileDown, AlertCircle, CheckCircle2
} from 'lucide-react';
import { smartBadiApi } from '../../services/smartBadiApi.ts';
import toast from 'react-hot-toast';

interface AddStudentProps {
  onNavigate: (page: any) => void;
  userRole: string;
}

export function AddStudent({ onNavigate, userRole }: AddStudentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '', rollNo: '', class: '', section: '', dob: '', gender: '',
    fatherName: '', fatherMobile: '', motherName: '', motherMobile: '',
    bloodGroup: '', email: '', address: '',
    admissionDate: new Date().toISOString().split('T')[0]
  });

  // Simulate initial structural load for skeleton effect
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const requiredFields = ["FullName", "RollNumber", "MotherMobile", "BloodGroup", "Email"];
  const isManualFilled = formData.name && formData.rollNo && formData.email && formData.motherMobile && formData.bloodGroup;
  const isCsvValid = csvData !== null && csvData.length > 0;
  const canRegister = isManualFilled || isCsvValid;

  const downloadCSVTemplate = () => {
    const headers = ["FullName", "RollNumber", "Class", "Section", "DOB_YYYY_MM_DD", "Gender", "FatherName", "FatherMobile", "MotherName", "MotherMobile", "BloodGroup", "Email", "Address"];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SmartBadi_Student_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCsvError(null);
    setCsvData(null);

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim() !== "");
        if (rows.length < 2) {
          setCsvError("Inappropriate Data: File is empty.");
          return;
        }
        const allData = rows.map(row => row.split(',').map(cell => cell.trim()));
        const headers = allData[0];
        const missingHeaders = requiredFields.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          setCsvError(`Missing columns: ${missingHeaders.join(", ")}`);
          return;
        }
        setCsvData(allData.slice(1));
      };
      reader.readAsText(file);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', rollNo: '', class: '', section: '', dob: '', gender: '',
      fatherName: '', fatherMobile: '', motherName: '', motherMobile: '',
      bloodGroup: '', email: '', address: '',
      admissionDate: new Date().toISOString().split('T')[0]
    });
    setCsvData(null);
    setCsvError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadId = toast.loading("Processing Registration...");
    try {
      if (isCsvValid) {
        toast.error("Bulk upload logic updating...");
      } else {
        await smartBadiApi.registerStaffOrStudent({
          email: formData.email,
          profileData: { ...formData, role: 'student', full_name: formData.name }
        });
        toast.success("Student Registered Successfully!", { id: loadId });
        resetForm();
      }
    } catch (err: any) {
      toast.error(err.message, { id: loadId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f0f9ff]">
      <Sidebar activePage="add-student" onNavigate={onNavigate} userRole={userRole} />

      <main className="flex-1 p-4 md:p-8 pb-32 md:pb-40 overflow-y-auto">
        {/* Header Section */}
        <div className="flex flex-row justify-between items-center mb-8 text-left">
          <div className="max-w-[80%]">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">Student Registration</h1>
            <p className="text-gray-500 text-xs md:text-sm">Manage database via CSV or manual entry.</p>
          </div>
          <button onClick={() => onNavigate('dashboard')} className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {isInitialLoading ? (
          <RegistrationSkeleton />
        ) : (
          <>
            {/* --- BULK UPLOAD SECTION --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-10">
              <div className="bg-white p-5 md:p-6 rounded-[24px] md:rounded-[32px] shadow-sm border-2 border-blue-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-left w-full">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><FileDown size={24} /></div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">CSV Template</h4>
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Required Structure</p>
                  </div>
                </div>
                <button onClick={downloadCSVTemplate} className="w-full sm:w-auto px-5 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-600 transition-all">Download</button>
              </div>

              <div className={`bg-white p-5 md:p-6 rounded-[24px] md:rounded-[32px] shadow-sm border-2 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${csvError ? 'border-red-200 bg-red-50/30' : isCsvValid ? 'border-green-200 bg-green-50/30' : 'border-green-50'}`}>
                <div className="flex items-center gap-4 text-left w-full">
                  <div className={`p-3 rounded-2xl ${csvError ? 'bg-red-100 text-red-500' : isCsvValid ? 'bg-green-100 text-green-500' : 'bg-green-50 text-green-500'}`}>
                    {isCsvValid ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Bulk Upload</h4>
                    <p className={`text-[10px] leading-tight font-bold ${csvError ? 'text-red-600' : 'text-gray-400 uppercase tracking-widest'}`}>
                      {csvError || (isCsvValid ? `${csvData?.length} Records Validated` : 'Select .CSV File')}
                    </p>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto px-5 py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-green-600 transition-all">Select</button>
              </div>
            </div>

            {/* --- INDIVIDUAL FORM SECTION --- */}
            <form onSubmit={handleSubmit} className={`space-y-8 transition-all duration-300 ${isCsvValid ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
              <div className="bg-white rounded-[32px] p-6 shadow-sm border-2 border-dashed border-blue-100 flex flex-col items-center justify-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-400 mb-2 border-2 border-white shadow-inner"><ImageIcon size={32} /></div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Optional Profile Photo</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                <FormSection title="Academic Details" icon={<GraduationCap size={16} className="text-blue-500" />} borderColor="border-blue-100">
                  <Input label="Full Name *" placeholder="Student legal name" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />
                  <Input label="Roll Number *" placeholder="e.g. 2024001" value={formData.rollNo} onChange={(e: any) => setFormData({ ...formData, rollNo: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Grade *" options={['10th', '9th', '8th']} value={formData.class} onChange={(e: any) => setFormData({ ...formData, class: e.target.value })} />
                    <Select label="Section *" options={['A', 'B', 'C']} value={formData.section} onChange={(e: any) => setFormData({ ...formData, section: e.target.value })} />
                  </div>
                </FormSection>

                <FormSection title="Family Info" icon={<UserCircle size={16} className="text-orange-500" />} borderColor="border-orange-100">
                  <Input label="Father Name" placeholder="Father's full name" value={formData.fatherName} onChange={(e: any) => setFormData({ ...formData, fatherName: e.target.value })} />
                  <Input label="Mother Name" placeholder="Mother's full name" value={formData.motherName} onChange={(e: any) => setFormData({ ...formData, motherName: e.target.value })} />
                  <Input label="Guardian Mobile *" placeholder="10 digit number" value={formData.motherMobile} onChange={(e: any) => setFormData({ ...formData, motherMobile: e.target.value })} />
                </FormSection>

                <FormSection title="System & Personal" icon={<Users2 size={16} className="text-green-500" />} borderColor="border-green-100">
                  <Input label="Email Address *" type="email" placeholder="login@smartbadi.com" value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Blood Group *" options={['O+', 'A+', 'B+', 'AB+']} value={formData.bloodGroup} onChange={(e: any) => setFormData({ ...formData, bloodGroup: e.target.value })} />
                    <Input label="DOB *" type="date" value={formData.dob} onChange={(e: any) => setFormData({ ...formData, dob: e.target.value })} />
                  </div>
                  <Input label="Residential Address" placeholder="Street, City" value={formData.address} onChange={(e: any) => setFormData({ ...formData, address: e.target.value })} />
                </FormSection>
              </div>
            </form>
          </>
        )}

        {/* --- STICKY ACTION BAR --- */}
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-12 md:bottom-8 z-50 flex items-center justify-center gap-3 bg-white/90 backdrop-blur-md p-3 rounded-3xl md:rounded-full shadow-2xl border border-white/50">
          <button type="button" onClick={resetForm} className="px-4 md:px-6 py-3 text-gray-400 text-xs md:text-sm font-bold hover:bg-gray-100 rounded-full flex items-center gap-2 transition-all">
            <RotateCcw size={16} /> <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canRegister || isSaving}
            className={`px-6 md:px-10 py-3 rounded-full text-xs md:text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 ${canRegister && !isSaving ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isSaving ? <Loader2Small /> : <Save size={18} />}
            {isCsvValid ? `Import ${csvData?.length} Students` : 'Register Student'}
          </button>
        </div>
      </main>
    </div>
  );
}

// Internal Helper UI Components
function RegistrationSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => <div key={i} className="h-24 bg-gray-200 rounded-[32px]" />)}
      </div>
      <div className="h-40 bg-gray-200 rounded-[32px]" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-200 rounded-[30px]" />)}
      </div>
    </div>
  );
}

function Loader2Small() {
  return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}

function FormSection({ title, icon, children, borderColor }: any) {
  return (
    <div className="space-y-4 text-left">
      <h3 className="flex items-center gap-2 px-2 font-black text-gray-700 uppercase tracking-[2px] text-[10px]">{icon} {title}</h3>
      <div className={`bg-white rounded-[30px] p-5 md:p-6 shadow-sm space-y-4 border-2 ${borderColor}`}>{children}</div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{label}</label>
      <input {...props} className="w-full bg-gray-50 border-none rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-400 outline-none transition-all placeholder:text-gray-300" />
    </div>
  );
}

function Select({ label, options, value, onChange }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{label}</label>
      <select value={value} onChange={onChange} className="w-full bg-gray-50 border-none rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-400 outline-none appearance-none cursor-pointer">
        <option value="">Select</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}