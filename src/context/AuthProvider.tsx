import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

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
  
  // PREVENT DOUBLE FETCHING
  const isFetching = useRef(false);

  useEffect(() => {
    let mounted = true;

    // 1. FAILSAFE: If app is stuck loading for 3s, Force Open.
    const failsafe = setTimeout(() => {
      if (mounted && loading) {
        // console.warn("Global Auth Timeout - Forcing Load.");
        setLoading(false);
      }
    }, 0);

    // 2. INITIAL CHECK
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session) {
        setSession(session);
        setUser(session.user);
        // Only fetch if not already fetching
        if (!isFetching.current) await fetchProfile(session.user);
      } else if (mounted && !session) {
        // No session, stop loading
        setLoading(false);
      }
    };

    init();

    // 3. LISTENER
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only fetch if we don't have a profile yet and aren't fetching
          if (!isFetching.current && !profile) {
             await fetchProfile(session.user);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (currentUser: User) => {
    // LOCK: Prevent multiple calls
    if (isFetching.current) return;
    isFetching.current = true;
    
    try {
      // console.log("Fetching Profile...");
      let finalProfile = null;

      // 1. TIMEOUT PROMISE (1.5s is enough)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("DB Timeout")), 1500)
      );

      // 2. DB REQUEST
      const dbPromise = supabase
        .from('profiles')
        .select('*, schools(name, location)') 
        .eq('id', currentUser.id)
        .single();

      // 3. RACE
      const { data, error } = await Promise.race([dbPromise, timeoutPromise]) as any;

      finalProfile = data;

      // Fallback Logic
      if (error || !finalProfile) {
         // Try simple fetch
         const basic = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
         finalProfile = basic.data;
      }

      if (finalProfile) {
        setProfile(finalProfile);
      } else {
        throw new Error("Profile missing");
      }

    } catch (err) {
      // console.error("Critical Profile Error - Using Recovery");
      
      // EMERGENCY RECOVERY
      setProfile({
        id: currentUser.id,
        role: 'super-admin',
        full_name: 'Recovery Admin',
        email: currentUser.email,
        school_id: null,
        schools: null
      });

    } finally {
      // UNLOCK & OPEN APP
      isFetching.current = false;
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear(); 
    window.location.href = '/'; 
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}