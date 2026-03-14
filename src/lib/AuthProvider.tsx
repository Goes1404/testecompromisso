
'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type UserRole = 'admin' | 'teacher' | 'student';

type Profile = {
  id: string;
  name: string;
  email: string;
  profile_type: string;
  status?: string;
  institution?: string;
  [key: string]: any;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  userRole: 'student',
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const userRole = useMemo((): UserRole => {
    if (!profile) return 'student';
    const rawType = (profile.profile_type || '').toLowerCase().trim();
    if (['admin', 'gestor', 'coordenador'].includes(rawType)) return 'admin';
    if (['teacher', 'mentor', 'professor', 'docente'].includes(rawType)) return 'teacher';
    return 'student';
  }, [profile]);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        if (data.status === 'suspended') {
          router.replace('/suspended');
          return null;
        }
        return data as Profile;
      }
      return null;
    } catch (error) {
      console.error('⚠️ [SUPABASE PROFILE ERROR]:', error);
      return null;
    }
  }, [router]);

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      if (p) setProfile(p);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Timeout estendido para 10s para ambientes de nuvem (Netlify/Vercel)
      const timeoutId = setTimeout(() => {
        if (loading && isMounted) {
          console.warn("⚠️ [AUTH TIMEOUT]: A conexão com o Supabase está demorando. Verifique as chaves no Netlify.");
          setLoading(false);
        }
      }, 10000);

      try {
        if (!isSupabaseConfigured) {
          console.error("❌ [SUPABASE CONFIG MISSING]: Verifique as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e KEY.");
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (initialSession && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          const p = await fetchProfile(initialSession.user.id);
          if (p && isMounted) {
            setProfile(p);
          }
        }
      } catch (e) {
        console.warn("⚠️ [AUTH INIT ERROR]:", e);
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      
      console.log(`🔐 [AUTH EVENT]: ${event}`);

      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        const p = await fetchProfile(currentSession.user.id);
        if (p && isMounted) setProfile(p);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [fetchProfile, router]);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
    window.location.href = "/login";
  };

  const contextValue = useMemo(() => ({
    user,
    session,
    profile,
    userRole,
    loading,
    signOut,
    refreshProfile,
  }), [user, session, profile, userRole, loading]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
