// context/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // INACTIVITY STATES
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [countdown, setCountdown] = useState(20);
  
  const isFetching = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. SIGN OUT LOGIC ---
  const signOut = useCallback(async () => {
    setLoading(true);
    // Timers clear cheyali
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    await supabase.auth.signOut();
    localStorage.clear();
    setProfile(null);
    setUser(null);
    setSession(null);
    lastUserId.current = null;
    setShowExpiryModal(false);
    
    toast.success("Logged out successfully");
    window.location.href = '/';
  }, []);

  const handleAutoLogout = useCallback(async () => {
    await signOut();
    toast.error("Session expired due to inactivity.");
  }, [signOut]);

  // --- 2. RESET INACTIVITY TIMER ---
  const resetInactivityTimer = useCallback(() => {
    // Modal open unte timer reset cheyakudadu
    if (showExpiryModal) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (lastUserId.current) {
      // TESTING: 1 Minute (60000ms) | PRODUCTION: 60 * 60 * 1000
      timeoutRef.current = setTimeout(() => {
        setShowExpiryModal(true);
        setCountdown(20); //
      }, 60 * 60 * 1000); 
    }
  }, [showExpiryModal]);

  // --- 3. COUNTDOWN EFFECT ---
  useEffect(() => {
    if (showExpiryModal && countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      handleAutoLogout();
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showExpiryModal, countdown, handleAutoLogout]);

  const fetchProfile = async (currentUser: User) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, schools(*)') 
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error("Profile Sync Error:", err.message);
      setProfile(null);
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial session
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (mounted && initSession) {
        setSession(initSession);
        setUser(initSession.user);
        lastUserId.current = initSession.user.id;
        fetchProfile(initSession.user);
        resetInactivityTimer();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;

      if (currentSession?.user?.id !== lastUserId.current) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        lastUserId.current = currentSession?.user?.id ?? null;

        if (currentSession?.user) {
          fetchProfile(currentSession.user);
          resetInactivityTimer();
        } else {
          setProfile(null);
          setLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      }
    });

    // --- 4. EVENT LISTENERS FOR ACTIVITY ---
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => resetInactivityTimer();

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => { 
      mounted = false; 
      subscription.unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetInactivityTimer]);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}

      {/* --- INACTIVITY WARNING MODAL --- */}
      <AnimatePresence>
        {showExpiryModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="text-amber-500 animate-pulse" size={40} />
                </div>
                
                <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Session Expiring!</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                  Due to an inactive session, you will be logged off in 
                  <span className="block text-3xl font-black text-red-600 mt-2">
                    {countdown}s
                  </span>
                </p>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setShowExpiryModal(false);
                      resetInactivityTimer();
                    }}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[12px] hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                  >
                    Keep Me Logged In
                  </button>
                  <button 
                    onClick={handleAutoLogout}
                    className="w-full py-3 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-red-500 transition-colors"
                  >
                    Logout Now
                  </button>
                </div>
              </div>
              
              {/* Progress bar at the bottom */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 20, ease: "linear" }}
                className="h-1.5 bg-red-500"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};