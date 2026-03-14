
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
      console.error('Erro ao buscar perfil:', error);
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
      // Timeout de segurança para evitar hang eterno se o Supabase/Rede falhar
      const timeoutId = setTimeout(() => {
        if (loading && isMounted) {
          console.warn("⚠️ [AUTH TIMEOUT]: Supabase demorou demais para responder.");
          setLoading(false);
        }
      }, 6000);

      try {
        if (!isSupabaseConfigured) {
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          const p = await fetchProfile(initialSession.user.id);
          if (p && isMounted) {
            setProfile(p);
          }
        }
      } catch (e) {
        console.warn("Auth init error:", e);
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      
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
