import React, { useState } from 'react';
import { Mail, Lock, Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import logo from '../../assets/smartbadi.png';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { smartBadiApi } from '../../services/smartBadiApi.ts';
import { LoginFormSkeleton } from '../../components/common/skeletoncomp'; // Import skeleton

interface LoginPageProps {
  schoolContext: any;
  onBackToLanding: () => void;
  onSwitchToForgotPassword: () => void;
  onLoginSuccess: () => void;
}

export function LoginPage({
  schoolContext,
  onBackToLanding,
  onSwitchToForgotPassword,
  onLoginSuccess
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- SKELETON TRIGGER ---
  // If schoolContext is missing (e.g. storage retrieval delay), show skeleton
  if (!schoolContext) return <LoginFormSkeleton />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const data = await smartBadiApi.secureLogin({
        email: email.trim().toLowerCase(),
        password,
        school_id: schoolContext?.id
      });

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) throw sessionError;

      toast.success("Identity Verified. Welcome back!");
      onLoginSuccess();
    } catch (err: any) {
      const edgeError = err.response?.data?.error; 
      const finalMsg = edgeError || err.message || "Login failed";
      setErrorMsg(finalMsg);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[40px] shadow-2xl p-10 w-full max-w-md border border-gray-100 relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={onBackToLanding}
        className="absolute left-8 top-10 text-gray-400 hover:text-blue-600 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Back to institution selection
      </button>

      <div className="flex justify-center mb-6 mt-8">
        <img src={logo} alt="SmartBadi Logo" className="h-20 object-contain drop-shadow-sm" />
      </div>

      <div className="text-center mb-10">
        <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-none uppercase">Welcome back</h1>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <p className="text-blue-700 text-[10px] font-black uppercase tracking-wider">
            {schoolContext?.name}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-start gap-3 shadow-sm shadow-red-50"
          >
            <ShieldAlert className="text-red-500 shrink-0" size={18} />
            <p className="text-[10px] font-black text-red-600 leading-relaxed uppercase tracking-tight">
              {errorMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-slate-800 disabled:opacity-50 text-sm"
              placeholder="e.g. admin@school.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest">Secure Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-slate-800 disabled:opacity-50 text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex justify-end pr-2">
          <button
            type="button"
            onClick={onSwitchToForgotPassword}
            className="text-[10px] font-black text-blue-600 hover:text-slate-900 uppercase tracking-widest transition-colors"
          >
            forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 md:py-5 bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-[2px] hover:bg-slate-900 shadow-2xl shadow-blue-100 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span className="animate-pulse">Validating Identity...</span>
            </>
          ) : 'Verify & Enter'}
        </button>
      </form>
    </div>
  );
}