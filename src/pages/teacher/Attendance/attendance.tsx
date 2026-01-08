import { useState } from 'react';
import { Sidebar } from '../../../components/sidebar';
import { StudentProfile } from '../../../components/studentprofile';
import {
    Search, RotateCcw, ArrowLeft, Calendar as CalendarIcon,
    School, BookOpen, Layers, Clock, CheckCircle2, XCircle,
    Clock3, Save, Send, Edit3, ChevronUp, ChevronDown,
    Hash, Phone
} from 'lucide-react';

// Define the Student Type for better type safety
interface Student {
    id: string;
    name: string;
    photo: string;
    status: string;
    gender: string;
    dob: string;
    admissionDate: string;
    fatherName: string;
    fatherMobile: string;
    motherName: string;
    motherMobile: string;
    bloodGroup: string;
    address: string;
}

interface AttendancePageProps {
    onNavigate: (page: any) => void;
    userRole: string;
}

export function AttendancePage({ onNavigate, userRole }: AttendancePageProps) {
    const [hasSearched, setHasSearched] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState({
        school: '', className: '', section: '', academicYear: '2025-26',
        date: new Date().toISOString().split('T')[0]
    });

    const dummyStudents: Student[] = Array.from({ length: 50 }, (_, i) => ({
        id: `STU${1000 + i}`,
        name: `Student Name ${i + 1}`,
        photo: `https://i.pravatar.cc/150?u=${i + 100}`,
        status: 'pending',
        gender: i % 2 === 0 ? 'Male' : 'Female',
        dob: '06-Jun-2010',
        admissionDate: '28-Jun-2024',
        fatherName: `Mr. Ramesh Kumar ${i + 1}`,
        fatherMobile: '+91 9988776655',
        motherName: `Ms. Sunita Devi ${i + 1}`,
        motherMobile: '+91 8877665544',
        bloodGroup: i % 4 === 0 ? 'O+' : 'A+',
        address: '123 Street, Hyderabad, Telangana'
    }));

    const [students, setStudents] = useState<Student[]>(dummyStudents);

    const handleSearch = () => {
        if (formData.school && formData.className && formData.section) {
            setHasSearched(true);
            setIsEditing(true);
        } else {
            alert("Please select all mandatory fields!");
        }
    };

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    // FIXED: Explicitly typed 'e' as React.MouseEvent
    const updateStatus = (e: React.MouseEvent, index: number, status: string) => {
        e.stopPropagation(); 
        if (!isEditing) return;
        const newStudents = [...students];
        newStudents[index].status = status;
        setStudents(newStudents);
    };

    return (
        <div className="flex min-h-screen bg-[#f0f9ff]">
            {/* FIXED: Passed missing onNavigate and userRole props to Sidebar */}
            <Sidebar activePage="attendance" onNavigate={onNavigate} userRole={userRole} />

            <main className="flex-1 p-4 md:p-8 pb-32">
                <div className="flex items-center gap-4 mb-8 text-left">
                    <button onClick={() => onNavigate('dashboard')} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Take Attendance</h1>
                </div>

                {/* Filter Card */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border-2 border-[#e6f9f0] mb-8 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        <Dropdown label="School *" icon={<School size={16} className="text-blue-500" />} name="school" value={formData.school} onChange={(e: any) => setFormData({ ...formData, school: e.target.value })}>
                            <option value="">Select School</option>
                            <option value="school_1">Global Public School</option>
                        </Dropdown>
                        <Dropdown label="Class *" icon={<BookOpen size={16} className="text-green-500" />} name="className" value={formData.className} onChange={(e: any) => setFormData({ ...formData, className: e.target.value })}>
                            <option value="">Select Class</option>
                            {[1, 2, 3].map(n => <option key={n} value={n.toString()}>Class {n}</option>)}
                        </Dropdown>
                        <Dropdown label="Section *" icon={<Layers size={16} className="text-orange-500" />} name="section" value={formData.section} onChange={(e: any) => setFormData({ ...formData, section: e.target.value })}>
                            <option value="">Select Section</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                        </Dropdown>
                        <Dropdown label="Year *" icon={<Clock size={16} className="text-purple-500" />} name="academicYear" value={formData.academicYear} onChange={(e: any) => setFormData({ ...formData, academicYear: e.target.value })}>
                            <option value="2025-26">2025-26</option>
                        </Dropdown>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                                <CalendarIcon size={16} className="text-red-500" /> Date *
                            </label>
                            <input type="date" name="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10">
                        <button onClick={handleSearch} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#3b82f6] text-white rounded-full font-bold shadow-lg shadow-blue-100 transition-transform active:scale-95">
                            <Search size={18} /> Search
                        </button>
                        <button onClick={() => setHasSearched(false)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-white text-gray-600 border border-gray-200 rounded-full font-bold">
                            <RotateCcw size={18} /> Reset
                        </button>
                    </div>
                </div>

                {hasSearched ? (
                    <div className="relative">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {students.map((student, index) => (
                                <div
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`bg-white p-4 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all cursor-pointer ${!isEditing ? 'opacity-75' : 'hover:shadow-md hover:scale-[1.02]'}`}
                                >
                                    <div className="relative mb-3">
                                        <img src={student.photo} alt={student.name} className="w-20 h-20 rounded-full border-4 border-[#f0f9ff] object-cover shadow-sm" />
                                        <div className={`absolute bottom-0 right-0 p-1 rounded-full border-2 border-white 
                                            ${student.status === 'present' ? 'bg-green-500' : student.status === 'absent' ? 'bg-red-500' : student.status === 'late' ? 'bg-orange-500' : 'bg-gray-300'}`}>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{student.id}</span>
                                    <h3 className="text-sm font-bold text-gray-800 mt-1 truncate w-full px-2">{student.name}</h3>

                                    <div className={`flex gap-2 mt-4 ${!isEditing ? 'pointer-events-none' : ''}`}>
                                        <StatusBtn active={student.status === 'present'} color="green" onClick={(e) => updateStatus(e, index, 'present')} icon={<CheckCircle2 size={18} />} />
                                        <StatusBtn active={student.status === 'absent'} color="red" onClick={(e) => updateStatus(e, index, 'absent')} icon={<XCircle size={18} />} />
                                        <StatusBtn active={student.status === 'late'} color="orange" onClick={(e) => updateStatus(e, index, 'late')} icon={<Clock3 size={18} />} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Floating Action Bar */}
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-12 md:translate-x-0 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-2xl border border-white/50">
                            <div className="flex flex-col gap-1 mr-2 border-r border-gray-200 pr-2">
                                <button onClick={scrollToTop} className="p-1.5 hover:bg-gray-100 rounded-full text-blue-500 transition-colors"><ChevronUp size={20} /></button>
                                <button onClick={scrollToBottom} className="p-1.5 hover:bg-gray-100 rounded-full text-blue-500 transition-colors"><ChevronDown size={20} /></button>
                            </div>
                            <button onClick={() => setIsEditing(true)} className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold transition-all ${isEditing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}>
                                <Edit3 size={18} /> <span className="hidden sm:inline text-sm">Edit</span>
                            </button>
                            <button onClick={() => { setIsEditing(false); alert("Draft Saved!"); }} className="flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-full font-bold shadow-lg hover:bg-orange-600 transition-all">
                                <Save size={18} /> <span className="hidden sm:inline text-sm">Save</span>
                            </button>
                            <button onClick={() => { if (window.confirm("Submit final attendance?")) setIsEditing(false); }} className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-full font-bold shadow-lg hover:bg-green-600 transition-all">
                                <Send size={18} /> <span className="hidden sm:inline text-sm">Submit</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-8 border-2 border-dashed border-gray-200 rounded-[32px] h-64 flex items-center justify-center text-gray-400 font-medium">
                        Select all fields and click Search to load the student list.
                    </div>
                )}

                {/* MODAL CALL */}
                <StudentProfile
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />

            </main>
        </div>
    );
}

// Internal DetailRow Component
function DetailRow({ label, value, icon }: { label: string, value: string, icon?: any }) {
    return (
        <div className="flex justify-between items-center border-b border-white/60 pb-1.5 last:border-0">
            <span className="text-gray-500 text-[11px] flex items-center gap-1.5 uppercase font-medium whitespace-nowrap">
                {icon} {label}
            </span>
            <span className="font-bold text-gray-800 text-xs text-right truncate ml-2">
                {value || "Not Set"}
            </span>
        </div>
    );
}

// Internal Status Button Component
function StatusBtn({ active, color, onClick, icon }: { active: boolean, color: string, onClick: (e: any) => void, icon: any }) {
    const colors: any = {
        green: active ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-500 hover:bg-green-100',
        red: active ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-500 hover:bg-red-100',
        orange: active ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-50 text-orange-500 hover:bg-orange-100',
    };
    return (
        <button onClick={onClick} className={`p-2 rounded-full transition-all active:scale-90 ${colors[color]}`}>
            {icon}
        </button>
    );
}

// Internal Dropdown Component
function Dropdown({ label, icon, name, value, onChange, children }: any) {
    return (
        <div className="space-y-2 text-left">
            <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">{icon} {label}</label>
            <select 
                name={name} 
                value={value} 
                onChange={onChange} 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer"
            >
                {children}
            </select>
        </div>
    );
}