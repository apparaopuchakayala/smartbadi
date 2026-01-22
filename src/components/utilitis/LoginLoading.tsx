import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';

export function LoginLoading() {
    return (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md">
            <div className="relative flex flex-col items-center">
                
                {/* Outer Rotating Ring */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="w-32 h-32 border-t-2 border-b-2 border-blue-500 rounded-full"
                />

                {/* Inner Pulsing Ring */}
                <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-4 border-l-2 border-r-2 border-[#8DC63F] rounded-full opacity-50"
                />

                {/* Central Icon Animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ 
                            opacity: [0, 1, 1, 0], 
                            scale: [0.5, 1.2, 1, 0.8],
                            rotateY: [0, 180, 360, 540]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="text-white"
                    >
                        <GraduationCap size={40} className="text-blue-400" />
                    </motion.div>
                </div>

                {/* Floating Particles */}
                <div className="absolute -top-10 -left-10">
                    <motion.div animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-[#8DC63F]"><Sparkles size={20}/></motion.div>
                </div>
                <div className="absolute -bottom-10 -right-10">
                    <motion.div animate={{ y: [0, 20, 0], opacity: [0, 1, 0] }} transition={{ duration: 2, delay: 1, repeat: Infinity }} className="text-blue-400"><BookOpen size={20}/></motion.div>
                </div>
            </div>

            {/* Text Logic */}
            <div className="mt-12 text-center space-y-2">
                <motion.h2 
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-2xl font-black text-white uppercase tracking-[8px] ml-2"
                >
                    Smart<span className="text-blue-500">Badi</span>
                </motion.h2>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-[4px]">
                    <ShieldCheck size={14} className="text-[#8DC63F]" /> Initializing Academic Core
                </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="mt-8 w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                />
            </div>
        </div>
    );
}