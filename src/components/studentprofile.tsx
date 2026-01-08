import { X, Mail, Phone, Calendar, Hash, MapPin, Award, GraduationCap, User, Users2, Heart, UserCircle, Clock } from 'lucide-react';

interface StudentProfileProps {
  student: any;
  onClose: () => void;
}

export function StudentProfile({ student, onClose }: StudentProfileProps) {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 text-left">
      <div className="bg-white w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-[30px] md:rounded-[40px] shadow-2xl relative animate-in zoom-in duration-300">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 z-10 transition-colors">
          <X size={24} />
        </button>

        <div className="p-5 md:p-10">
          {/* Top Profile Header */}
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 mb-8 border-b border-gray-100 pb-8">
            <div className="relative">
              <img src={student.photo} className="w-28 h-28 md:w-40 md:h-40 rounded-[28px] md:rounded-[32px] object-cover border-4 border-[#f0f9ff] shadow-md" />
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-bold border-2 border-white">Active</div>
            </div>

            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black text-gray-800 uppercase tracking-tight">{student.name}</h2>
              <p className="text-blue-500 font-bold mb-4">{student.id} • Class 10A</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <span className="bg-[#eefcf5] text-green-600 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Award size={14} /> Course Completed
                </span>
                <span className="bg-red-50 text-red-500 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
                  <Heart size={14} className="fill-current" /> {student.bloodGroup || 'O+'}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Academic Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 px-2 uppercase tracking-widest"><GraduationCap size={18} className="text-blue-500" /> Academic Details</h3>
              <div className="bg-[#f0f9ff] rounded-[24px] p-5 space-y-3 shadow-sm">
                <DetailRow label="Roll No" value={student.id} icon={<Hash size={14} />} />
                <DetailRow label="Adm. Date" value={student.admissionDate} icon={<Calendar size={14} />} />
                <DetailRow label="Institution" value="Global Public School" icon={<MapPin size={14} />} />
                <DetailRow label="Batch" value="2025-26" icon={<Clock size={14}/>} />
              </div>
            </div>

            {/* Family Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 px-2 uppercase tracking-widest"><UserCircle size={18} className="text-orange-500" /> Family Details</h3>
              <div className="bg-[#fff7ed] rounded-[24px] p-5 space-y-3 border border-orange-50 shadow-sm">
                <DetailRow label="Father Name" value={student.fatherName} icon={<User size={14} />} />
                <DetailRow label="Father Mobile" value={student.fatherMobile} icon={<Phone size={14} />} />
                <DetailRow label="Mother Name" value={student.motherName} icon={<User size={14} />} />
                <DetailRow label="Mother Mobile" value={student.motherMobile} icon={<Phone size={14} />} />
              </div>
            </div>

            {/* Health Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 px-2 uppercase tracking-widest"><Users2 size={18} className="text-green-500" /> Personal Details</h3>
              <div className="bg-[#f0fdf4] rounded-[24px] p-5 space-y-3 shadow-sm">
                <DetailRow label="DOB" value={student.dob} icon={<Calendar size={14} />} />
                <DetailRow label="Gender" value={student.gender} icon={<User size={14}/>} />
                <DetailRow label="Blood Group" value={student.bloodGroup} icon={<Heart size={14} className="text-red-500" />} />
                <DetailRow label="Email" value="stu@school.com" icon={<Mail size={14} />} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Performance', 'Health', 'Attendance', 'ID Card'].map((label, i) => (
              <button key={i} className="py-3 px-2 rounded-xl font-bold text-[10px] uppercase bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-500 transition-all active:scale-95 shadow-sm">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="flex justify-between items-center border-b border-white/60 pb-1.5 last:border-0">
      <span className="text-gray-500 text-[11px] flex items-center gap-1.5 uppercase font-medium whitespace-nowrap">{icon} {label}</span>
      <span className="font-bold text-gray-800 text-xs text-right truncate ml-2">{value || "Not Set"}</span>
    </div>
  );
}