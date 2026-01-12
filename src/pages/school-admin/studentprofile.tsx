import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Mail, Phone, Calendar, User, MapPin, 
    Droplets, GraduationCap, ShieldCheck, Heart 
} from 'lucide-react';
import { motion } from 'framer-motion';

export function StudentProfile() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const student = state?.student;

    if (!student) return <div className="p-10 text-center font-black uppercase text-slate-400">Student Record Not Found</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 text-left">
            {/* Back Button */}
            <button 
                onClick={() => navigate(-1)}
                className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
            >
                <ArrowLeft size={16} /> Return to Registry
            </button>

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: ID Card Style */}
                <motion.div 
                    initial={{ x: -50, opacity: 0 }} 
                    animate={{ x: 0, opacity: 1 }}
                    className="lg:col-span-1 space-y-6"
                >
                    <div className="bg-white rounded-[50px] p-8 border border-white shadow-2xl shadow-blue-100 overflow-hidden relative group text-center">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-[#8DC63F]" />
                        
                        {/* Avatar */}
                        <div className="relative mt-12 mb-6 inline-block">
                            <div className="w-40 h-40 rounded-[50px] border-8 border-white overflow-hidden shadow-xl bg-slate-100 mx-auto">
                                {student.avatar_url ? (
                                    <img src={student.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                        <User size={64} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 p-3 bg-[#8DC63F] text-white rounded-2xl shadow-lg border-4 border-white">
                                <ShieldCheck size={20} />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{student.full_name}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] mt-2">Roll No: {student.roll_number || student.employee_id}</p>
                        
                        <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <span className="block text-[10px] font-black text-slate-400 uppercase">Class</span>
                                <span className="text-lg font-black text-blue-600">{student.current_class}</span>
                            </div>
                            <div className="text-center border-l border-slate-50">
                                <span className="block text-[10px] font-black text-slate-400 uppercase">Section</span>
                                <span className="text-lg font-black text-[#8DC63F]">{student.current_section || student.address}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-[#2C3E50] rounded-[40px] p-6 text-white shadow-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/10 rounded-2xl"><Heart className="text-red-400" size={20}/></div>
                            <div>
                                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Medical Record</p>
                                <p className="text-sm font-black uppercase">Blood Group: {student.blood_group}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Column: Detailed Info */}
                <motion.div 
                    initial={{ y: 50, opacity: 0 }} 
                    animate={{ y: 0, opacity: 1 }}
                    className="lg:col-span-2 space-y-8"
                >
                    {/* Personal Information */}
                    <section className="bg-white rounded-[50px] p-10 shadow-sm border border-slate-50">
                        <h4 className="flex items-center gap-3 text-[12px] font-black uppercase tracking-[3px] text-slate-400 border-b border-slate-50 pb-6 mb-8">
                            <GraduationCap className="text-blue-500" size={20} /> Personal & Academic Details
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 text-left">
                            <InfoField icon={<User />} label="Gender" value={student.gender} />
                            <InfoField icon={<Calendar />} label="Date of Birth" value={student.dob} />
                            <InfoField icon={<Mail />} label="Email Address" value={student.email} />
                            <InfoField icon={<MapPin />} label="Residential Address" value={student.address || student.residential_address} isFull />
                        </div>
                    </section>

                    {/* Family & Guardian Information */}
                    <section className="bg-white rounded-[50px] p-10 shadow-sm border border-slate-50">
                        <h4 className="flex items-center gap-3 text-[12px] font-black uppercase tracking-[3px] text-slate-400 border-b border-slate-50 pb-6 mb-8">
                            <Heart className="text-[#8DC63F]" size={20} /> Family & Guardian Info
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 text-left">
                            <InfoField icon={<User />} label="Father's Name" value={student.father_name} />
                            <InfoField icon={<Phone />} label="Father's Mobile" value={student.mobile_number || student.father_mobile} />
                            <InfoField icon={<User />} label="Mother's Name" value={student.mother_name} />
                            <InfoField icon={<Phone />} label="Mother's Mobile" value={student.mother_mobile} />
                        </div>
                    </section>
                </motion.div>

            </div>
        </div>
    );
}

// Helper Component for Fields
const InfoField = ({ icon, label, value, isFull = false }: any) => (
    <div className={`flex items-start gap-4 ${isFull ? 'md:col-span-2' : ''}`}>
        <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:text-blue-600 transition-colors">
            {React.cloneElement(icon, { size: 18 })}
        </div>
        <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-slate-700 mt-0.5">{value || 'Not Provided'}</p>
        </div>
    </div>
);