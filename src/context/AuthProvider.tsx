// context/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

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
  
  const isFetching = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const fetchProfile = async (currentUser: User) => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, schools(name, location)')
        .eq('id', currentUser.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.er  ror("Profile Error:", err.message);
      setProfile(null);
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (mounted && initSession) {
        setSession(initSession);
        setUser(initSession.user);
        lastUserId.current = initSession.user.id;
        fetchProfile(initSession.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      
      // Performance guard: Only fetch if user changed
      if (currentSession?.user?.id !== lastUserId.current) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        lastUserId.current = currentSession?.user?.id ?? null;
        
        if (currentSession?.user) {
          fetchProfile(currentSession.user);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    localStorage.clear();
    setProfile(null);
    setUser(null);
    setSession(null);
    lastUserId.current = null;
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext)!;