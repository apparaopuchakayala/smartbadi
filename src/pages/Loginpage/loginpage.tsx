import React, { useState } from 'react';
import { Mail, Lock, Loader2, ArrowLeft ,ShieldAlert} from 'lucide-react';
import logo from '../../assets/smartbadi.png';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence  } from 'framer-motion';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('secure-login', {
        body: {
          email: email.trim().toLowerCase(),
          password,
          school_id: schoolContext?.id
        }
      });

      if (funcError) {
        const errorDetails = await funcError.context?.json();
        throw new Error(errorDetails?.error || "Security Check Failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) throw sessionError;

        toast.success("Identity Verified. Welcome back!");
        onLoginSuccess();
      } else {
        throw new Error("Unable to establish secure session.");
      }

    } catch (err: any) {
      // toast.error(err.message);
      setErrorMsg(err.message);
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
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">Welcome To</h1>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          <p className="text-blue-600 text-[11px] font-bold uppercase tracking-wider">
            {schoolContext?.name || "Select Institution First"}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
          >
            <ShieldAlert className="text-red-500 shrink-0" size={18} />
            <p className="text-[11px] font-bold text-red-600 leading-relaxed uppercase tracking-tight">
              {errorMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-4 tracking-widest">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-400 focus:bg-white outline-none transition-all font-medium text-gray-700 disabled:opacity-50"
              placeholder="admin@school.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-4 tracking-widest">password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-400 focus:bg-white outline-none transition-all font-medium text-gray-700 disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex justify-end pr-2">
          <button
            type="button"
            onClick={onSwitchToForgotPassword}
            className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-widest"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span className="animate-pulse">Verifying Security...</span>
            </>
          ) : 'Verify & Enter'}
        </button>
      </form>
    </div>
  );
}