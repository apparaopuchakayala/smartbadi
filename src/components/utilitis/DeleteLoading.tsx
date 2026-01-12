import { motion } from 'framer-motion';
import { School, Truck } from 'lucide-react';

export const DeleteLoading = () => (
    <div className="flex flex-col items-center justify-center space-y-6 p-10 bg-white rounded-[40px] shadow-2xl border-b-8 border-red-500">
        <div className="relative w-64 h-20 flex items-center justify-between overflow-hidden px-4 border-b-4 border-slate-100">
            {/* School Icon stays fixed */}
            <School className="text-slate-300" size={40} />
            
            {/* Bus driving away to the left */}
            <motion.div
                initial={{ x: 50 }}
                animate={{ x: -250 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-0"
            >
                <div className="relative">
                    <Truck className="text-red-500 flip-horizontal" size={45} />
                    <div className="absolute top-2 left-2 w-4 h-2 bg-white/50 rounded-sm" />
                </div>
            </motion.div>
        </div>
        <div className="text-center">
            <h3 className="text-sm font-black text-red-600 uppercase tracking-widest animate-pulse">
                Removing Students from school...
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                Removing student records from the system
            </p>
        </div>
    </div>
);