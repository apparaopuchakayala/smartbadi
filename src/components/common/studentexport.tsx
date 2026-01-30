import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { 
    Download, Users, Filter, FileSpreadsheet, Loader2, Search 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export function StudentExportPage() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Data States
    const [allClasses, setAllClasses] = useState<any[]>([]); // Raw class list from DB
    const [students, setStudents] = useState<any[]>([]);
    
    // Selection States
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedClassId, setSelectedClassId] = useState(''); // The specific ID we need

    useEffect(() => {
        if (profile?.school_id) {
            fetchClasses();
        }
    }, [profile]);

    // 1. Fetch All Classes on Load
    const fetchClasses = async () => {
        const { data } = await supabase
            .from('school_classes')
            .select('id, class_name, section')
            .eq('school_id', profile?.school_id)
            .order('class_name');
        setAllClasses(data || []);
    };

    // 2. Handle Logic: When user selects Grade & Section -> Find ID & Fetch Students
    useEffect(() => {
        if (selectedGrade && selectedSection) {
            // Find the EXACT class row that matches both Name and Section
            const targetClass = allClasses.find(
                c => c.class_name === selectedGrade && c.section === selectedSection
            );

            if (targetClass) {
                setSelectedClassId(targetClass.id);
                fetchStudents(targetClass.id);
            } else {
                setStudents([]);
                setSelectedClassId('');
            }
        } else {
            setStudents([]);
        }
    }, [selectedGrade, selectedSection, allClasses]);

    // 3. Fetch Students using STRICT Class ID
    const fetchStudents = async (classId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, roll_number, gender, admission_number')
                .eq('class_id', classId) // <--- The most important part
                .eq('role', 'student')
                .order('roll_number');

            if (error) throw error;
            setStudents(data || []);
            if(data?.length === 0) toast("No students found in this class");
        } catch (err) {
            console.error(err);
            toast.error("Failed to load student list");
        } finally {
            setLoading(false);
        }
    };

    // 4. Download Excel Function
    const handleDownload = () => {
        if (students.length === 0) return toast.error("No data to export");

        // Format data for Excel
        const exportData = students.map(s => ({
            "Roll No": s.roll_number || '---',
            "Full Name": s.full_name,
            "Admission No": s.admission_number || '---',
            "Gender": s.gender || '---',
            "Class": selectedGrade,
            "Section": selectedSection
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        
        // Clean filename
        const fileName = `Students_${selectedGrade}_Section_${selectedSection}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success("Student List Downloaded!");
    };

    // Helper: Get Unique Class Names for Dropdown 1
    const uniqueClassNames = Array.from(new Set(allClasses.map(c => c.class_name)));

    // Helper: Get Sections for Selected Grade for Dropdown 2
    const availableSections = allClasses
        .filter(c => c.class_name === selectedGrade)
        .map(c => c.section);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 font-poppins min-h-screen bg-slate-50">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                        Student <span className="text-blue-700">Data Export</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Global Student Records Downloader
                    </p>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <FileSpreadsheet className="text-green-600" size={24} />
                </div>
            </div>

            {/* Controls Section */}
            <div className="bg-white p-8 rounded-[30px] shadow-xl border-4 border-white grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                
                {/* Grade Selector */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                        Select Grade
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedGrade}
                            onChange={(e) => {
                                setSelectedGrade(e.target.value);
                                setSelectedSection(''); // Reset section when grade changes
                            }}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none"
                        >
                            <option value="">-- Choose Grade --</option>
                            {uniqueClassNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                    </div>
                </div>

                {/* Section Selector */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                        Select Section
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            disabled={!selectedGrade}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none disabled:opacity-50"
                        >
                            <option value="">-- Choose Section --</option>
                            {availableSections.map(sec => (
                                <option key={sec} value={sec}>Section {sec}</option>
                            ))}
                        </select>
                        <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                    </div>
                </div>

                {/* Download Button */}
                <button 
                    onClick={handleDownload}
                    disabled={students.length === 0}
                    className="w-full p-4 bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    <Download size={20} /> Export Excel
                </button>
            </div>

            {/* Preview Section */}
            <div className="bg-white rounded-[30px] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="h-[400px] flex items-center justify-center text-blue-600">
                        <Loader2 className="animate-spin" size={40} />
                    </div>
                ) : students.length > 0 ? (
                    <>
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">Preview List</h3>
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold">
                                {students.length} Students Found
                            </span>
                        </div>
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white sticky top-0 z-10">
                                    <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                                        <th className="p-5">Roll No</th>
                                        <th className="p-5">Full Name</th>
                                        <th className="p-5">Admission No</th>
                                        <th className="p-5">Gender</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                                    {students.map((std, i) => (
                                        <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="p-5 text-slate-400">#{std.roll_number || '-'}</td>
                                            <td className="p-5 text-slate-900">{std.full_name}</td>
                                            <td className="p-5 text-slate-500">{std.admission_number || '-'}</td>
                                            <td className="p-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] uppercase ${std.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {std.gender || 'NA'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 space-y-4">
                        <div className="p-6 bg-slate-50 rounded-full">
                            <Users size={40} />
                        </div>
                        <p className="font-bold text-xs uppercase tracking-widest">Select a class to view data</p>
                    </div>
                )}
            </div>
        </div>
    );
}