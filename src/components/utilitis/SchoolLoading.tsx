import { motion } from 'framer-motion';
import { School, User } from 'lucide-react';

export const SchoolLoading = () => (
    <div className="flex flex-col items-center justify-center space-y-6 p-10 bg-white rounded-[40px] shadow-2xl">
        <div className="relative w-64 h-20 flex items-center justify-between overflow-hidden px-4 border-b-4 border-slate-100">
            {/* స్కూల్ ఐకాన్ */}
            <School className="text-blue-600" size={40} />
            
            {/* స్కూల్‌కి వెళ్తున్న విద్యార్థి */}
            <motion.div
                initial={{ x: -200 }}
                animate={{ x: 10 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute right-0"
            >
                <div className="relative">
                    <User className="text-orange-500 animate-bounce" size={32} />
                    {/* బ్యాగ్ లాంటి చిన్న ఎఫెక్ట్ */}
                    <div className="absolute -top-1 -right-1 w-2 h-4 bg-orange-700 rounded-sm" />
                </div>
            </motion.div>
        </div>
        <div className="text-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">
                Admission in Progress...
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                Students are heading to their school
            </p>
        </div>
    </div>
);