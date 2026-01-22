import React, { useState, useRef } from 'react';
import { Sidebar } from '../../components/sidebar';
import {
  X, Mail, Phone, Calendar as CalendarIcon, Hash, MapPin,
  GraduationCap, User, Users2, Heart, UserCircle, Save,
  RotateCcw, Image as ImageIcon, FileUp, FileDown, AlertCircle, CheckCircle2
} from 'lucide-react';
import {smartBadiApi} from '../../services/smartBadiApi.ts';

interface AddStudentProps {
  onNavigate: (page: any) => void;
  userRole: string;
}

export function AddStudent({ onNavigate, userRole }: AddStudentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<any[] | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', rollNo: '', class: '', section: '', dob: '', gender: '',
    fatherName: '', fatherMobile: '', motherName: '', motherMobile: '',
    bloodGroup: '', email: '', address: '',
    admissionDate: new Date().toISOString().split('T')[0]
  });

  // --- MANDATORY FIELDS CONFIG (Used for both Form and CSV) ---
  const requiredFields = ["FullName", "RollNumber", "MotherMobile", "BloodGroup", "Email"];

  // 1. Validation for Manual Form
  const isManualFilled = formData.name && formData.rollNo && formData.email && formData.motherMobile && formData.bloodGroup;

  // 2. Validation for CSV
  const isCsvValid = csvData !== null && csvData.length > 0;

  // 3. Enable Button Logic
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
          setCsvError("Inappropriate Data: File is empty or missing data rows.");
          return;
        }

        const allData = rows.map(row => row.split(',').map(cell => cell.trim()));
        const headers = allData[0];

        // Header Validation
        const missingHeaders = requiredFields.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          setCsvError(`Inappropriate Data: Missing mandatory columns (${missingHeaders.join(", ")})`);
          return;
        }

        // Row-level Content Validation
        const indices = requiredFields.map(h => headers.indexOf(h));
        const dataRows = allData.slice(1);
        const invalidRows: number[] = [];

        dataRows.forEach((row, idx) => {
          const isIncomplete = indices.some(index => !row[index] || row[index] === "");
          if (isIncomplete) invalidRows.push(idx + 2); // Header is row 1
        });

        if (invalidRows.length > 0) {
          setCsvError(`Inappropriate Data: Mandatory values missing at row(s): ${invalidRows.slice(0, 5).join(", ")}${invalidRows.length > 5 ? '...' : ''}`);
        } else {
          setCsvData(dataRows);
        }
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
        // Bulk Upload కోసం loop లేదా bulk API వాడాలి
        toast.error("Bulk upload logic updating...");
      } else {
        // Individual Registration
        await smartBadiApi.registerStaffOrStudent({
          email: formData.email,
          password: formData.encrypted_password,
          profileData: {
            ...formData,
            role: 'student',
            full_name: formData.name // Mapping name to full_name
          }
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
    <div className="flex min-h-screen bg-[#f0f9ff]">
      <Sidebar activePage="add-student" onNavigate={onNavigate} userRole={userRole} />

      {/* pb-40 ensures the content is not hidden by the floating Register button */}
      <main className="flex-1 p-4 md:p-8 pb-40 overflow-y-auto">
        <div className="flex justify-between items-center mb-8 text-left">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Student Registration</h1>
            <p className="text-gray-500 text-sm">Register via bulk CSV upload or manual entry.</p>
          </div>
          <button onClick={() => onNavigate('dashboard')} className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* --- SECTION 1: BULK UPLOAD --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-blue-50 flex items-center justify-between transition-all">
            <div className="flex items-center gap-4 text-left">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-500"><FileDown size={24} /></div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">CSV Template</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase text-blue-500">Includes Mandatory Fields</p>
              </div>
            </div>
            <button type="button" onClick={downloadCSVTemplate} className="px-5 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-600 transition-all">Download</button>
          </div>

          <div className={`bg-white p-6 rounded-[32px] shadow-sm border-2 flex items-center justify-between transition-all ${csvError ? 'border-red-200 bg-red-50/30' : isCsvValid ? 'border-green-200 bg-green-50/30' : 'border-green-50'}`}>
            <div className="flex items-center gap-4 text-left">
              <div className={`p-3 rounded-2xl ${csvError ? 'bg-red-100 text-red-500' : isCsvValid ? 'bg-green-100 text-green-500' : 'bg-green-50 text-green-500'}`}>
                {isCsvValid ? <CheckCircle2 size={24} /> : <FileUp size={24} />}
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Bulk Upload</h4>
                <p className={`text-[10px] leading-tight ${csvError ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                  {csvError || (isCsvValid ? `${csvData?.length} valid records ready` : 'Upload CSV with mandatory data')}
                </p>
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-5 py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-md hover:bg-green-600 transition-all">Select File</button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2 text-gray-400 mb-6 font-bold uppercase tracking-widest text-[10px]">
          <AlertCircle size={14} /> Individual Registration Entry
        </div>

        {/* --- SECTION 2: INDIVIDUAL FORM --- */}
        <form onSubmit={handleSubmit} className={`space-y-8 transition-all duration-300 ${isCsvValid ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className="bg-white rounded-[32px] p-6 shadow-sm border-2 border-dashed border-blue-100 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-400 mb-2 border-2 border-white shadow-inner"><ImageIcon size={32} /></div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer">Upload Photo</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <FormSection title="Academic" icon={<GraduationCap size={16} className="text-blue-500" />} borderColor="border-blue-50">
              <Input label="Full Name *" name="name" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />
              <Input label="Roll No *" name="rollNo" value={formData.rollNo} onChange={(e: any) => setFormData({ ...formData, rollNo: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Class *" options={['10A', '9A']} onChange={(e: any) => setFormData({ ...formData, class: e.target.value })} />
                <Select label="Section *" options={['A', 'B']} onChange={(e: any) => setFormData({ ...formData, section: e.target.value })} />
              </div>
            </FormSection>

            <FormSection title="Family" icon={<UserCircle size={16} className="text-orange-500" />} borderColor="border-orange-50">
              <Input label="Father Name *" name="fatherName" value={formData.fatherName} onChange={(e: any) => setFormData({ ...formData, fatherName: e.target.value })} />
              <Input label="Mother Name *" name="motherName" value={formData.motherName} onChange={(e: any) => setFormData({ ...formData, motherName: e.target.value })} />
              <Input label="Mother Mobile *" name="motherMobile" value={formData.motherMobile} onChange={(e: any) => setFormData({ ...formData, motherMobile: e.target.value })} />
            </FormSection>

            <FormSection title="Health & Personal" icon={<Users2 size={16} className="text-green-500" />} borderColor="border-green-50">
              <Input label="Email *" name="email" value={formData.email} onChange={(e: any) => setFormData({ ...formData, email: e.target.value })} />
              <Select label="Blood Group *" options={['O+', 'A+', 'B+', 'AB+']} onChange={(e: any) => setFormData({ ...formData, bloodGroup: e.target.value })} />
              <Input label="DOB *" type="date" name="dob" value={formData.dob} onChange={(e: any) => setFormData({ ...formData, dob: e.target.value })} />
            </FormSection>
          </div>
        </form>

        {/* --- GLOBAL ACTION BAR --- */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-12 md:translate-x-0 z-50 flex items-center gap-3 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-2xl border border-white/50">
          <button type="button" onClick={resetForm} className="px-6 py-3 text-gray-400 font-bold hover:bg-gray-100 rounded-full flex items-center gap-2 transition-all">
            <RotateCcw size={18} /> Reset
          </button>
          <button
            type="submit"
            disabled={!canRegister}
            onClick={handleSubmit}
            className={`px-10 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 ${canRegister ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
          >
            <Save size={18} /> {isCsvValid ? `Register ${csvData?.length} Bulk Students` : 'Register'}
          </button>
        </div>
      </main>
    </div>
  );
}

// Internal UI Components
function FormSection({ title, icon, children, borderColor }: any) {
  return (
    <div className="space-y-4 text-left">
      <h3 className="flex items-center gap-2 px-2 font-bold text-gray-700 uppercase tracking-widest text-[10px]">{icon} {title}</h3>
      <div className={`bg-white rounded-[30px] p-6 shadow-sm space-y-4 border ${borderColor}`}>{children}</div>
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

function Select({ label, options, onChange }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{label}</label>
      <select onChange={onChange} className="w-full bg-gray-50 border-none rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-400 outline-none appearance-none cursor-pointer">
        <option value="">Select</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}