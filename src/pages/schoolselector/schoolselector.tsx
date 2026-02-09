import React, { useState, useEffect } from 'react';
import logo from '../../assets/smartbadi.png'; 
import { supabase } from '../../services/supabaseClient';
import { Search, ArrowRight, AlertCircle, Building2, CheckCircle2, School, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SchoolItemSkeleton } from '../../components/common/skeletoncomp';
import toast from 'react-hot-toast';

// --- ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for "Apple-like" smoothness
      staggerChildren: 0.1 
    }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
};

export function SchoolSelector({ onSchoolSelect }: { onSchoolSelect: (school: any) => void }) {
  const [schools, setSchools] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    async function fetchSchools() {
      try {
        setLoading(true);
        const { data, error: err } = await supabase.from('schools').select('id,name,location').order('name');
        if (err) throw err;
        setSchools(data || []);
      } catch (err: any) {
        console.error("Fetch Error:", err.message);
        setError("Connection issue detected.");
        toast.error("Could not load schools");
      } finally {
        setLoading(false);
      }
    }
    fetchSchools();
  }, []);

  const filtered = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query.length < 3) return [];
    return schools.filter(s => s.name?.toLowerCase().includes(query)).slice(0, 5);
  }, [searchQuery, schools]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden ">
      
      {/* --- 1. ALIVE BACKGROUND (Cinematic) --- */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw]  rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute top-[40%] left-[40%] w-[30vw] h-[30vw]  rounded-full blur-[80px] animate-bounce" style={{ animationDuration: '12s' }}></div>
      </div>

      {/* --- 2. MAIN CARD --- */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-[520px] mx-4"
      >
        <div className="bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_40px_100px_-15px_rgba(0,0,0,0.1)] border border-white/60 p-7 md:p-7 overflow-hidden relative ">
          
          {/* Glass Reflection */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none"></div>

          {/* Logo & Header */}
          <div className="text-center relative z-10 mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="h-24 mx-auto mb-6 object-contain drop-shadow-sm"
            >
              <img src={logo} alt="SmartBadi" className="w-full h-full object-contain" />
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-slate-800 tracking-tight"
            >
              Welcome Back
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 font-medium mt-2"
            >
              Find your institution to verify identity
            </motion.p>
          </div>

          {/* Search Input */}
          <motion.div 
            layout
            className={`relative group transition-all duration-300 ${isFocused ? 'scale-105' : 'scale-100'}`}
          >
            <div className={`absolute inset-y-0 left-5 flex items-center pointer-events-none transition-colors duration-300 ${isFocused ? 'text-indigo-600' : 'text-slate-400'}`}>
              <Search size={22} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type your school name..."
              className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-3xl text-lg font-bold text-slate-800 placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelected(null); 
              }}
              autoFocus
            />
          </motion.div>

          {/* Results Container (Auto Resizing) */}
          <motion.div 
            layout 
            className="mt-4 relative overflow-hidden min-h-[100px]"
          >
            {loading ? (
              <div className="space-y-3 pt-2">
                {[1, 2].map((i) => <SchoolItemSkeleton key={i} />)}
              </div>
            ) : searchQuery.length < 2 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-8 flex flex-col items-center justify-center text-slate-300 gap-3"
              >
                 <div className="p-4 bg-slate-50/50 rounded-full border border-dashed border-slate-200">
                    <Sparkles size={24} />
                 </div>
                 <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Type at least 3 characters</p>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200"
              >
                 <p className="text-slate-400 text-sm font-bold">No schools found for "{searchQuery}"</p>
              </motion.div>
            ) : (
              <motion.div 
                layout 
                className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pt-2 pr-1"
              >
                <AnimatePresence mode='popLayout'>
                  {filtered.map((s) => (
                    <motion.button
                      key={s.id}
                      layout
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelected(s)}
                      className={`w-full flex items-center justify-between p-4 rounded-[24px] border transition-all duration-300 group relative overflow-hidden
                        ${selected?.id === s.id 
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-transparent text-white shadow-xl shadow-indigo-500/30' 
                          : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5'
                        }`}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-3 rounded-2xl transition-colors duration-300
                          ${selected?.id === s.id ? 'bg-white/20 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                          <Building2 size={20} strokeWidth={selected?.id === s.id ? 2.5 : 2} />
                        </div>
                        <div className="text-left">
                          <p className={`font-bold text-sm transition-colors ${selected?.id === s.id ? 'text-white' : 'text-slate-800'}`}>{s.name}</p>
                          <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 transition-colors ${selected?.id === s.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {s.location || 'Main Campus'}
                          </p>
                        </div>
                      </div>
                      
                      {selected?.id === s.id && (
                        <motion.div 
                          initial={{ scale: 0, rotate: -180 }} 
                          animate={{ scale: 1, rotate: 0 }} 
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="bg-white text-indigo-600 rounded-full p-1"
                        >
                          <CheckCircle2 size={18} strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>

          {/* Action Button */}
          <div className="mt-8 relative z-20">
            <motion.button
              disabled={!selected || loading}
              onClick={() => onSchoolSelect(selected)}
              whileHover={selected ? { scale: 1.03, boxShadow: "0 20px 40px -10px rgba(79, 70, 229, 0.4)" } : {}}
              whileTap={selected ? { scale: 0.97 } : {}}
              className={`w-full py-5 rounded-2xl font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all duration-300
                ${!selected 
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                  : 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                }`}
            >
              Continue <ArrowRight size={18} strokeWidth={3} />
            </motion.button>
          </div>

        </div>
        
        {/* Footer Credit */}
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="text-center mt-8 text-xs font-bold text-slate-400 uppercase tracking-widest"
        >
          Powered by SmartBadi
        </motion.p>
      </motion.div>
    </div>
  );
}