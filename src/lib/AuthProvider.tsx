'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  const isInitialized = useRef(false);
  const router = useRouter();

  const userRole = useMemo((): UserRole => {
    if (!profile) return 'student';
    const rawType = (profile.profile_type || '').toLowerCase().trim();
    if (['admin', 'gestor', 'coordenador'].includes(rawType)) return 'admin';
    if (['teacher', 'mentor', 'professor', 'docente', 'staff'].includes(rawType)) return 'teacher';
    return 'student';
  }, [profile]);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured || !userId) return null;
    
    // Otimização: Evitar requisição se o perfil já for o correto
    if (profile && profile.id === userId) return profile;

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
      console.error('Error fetching profile:', error);
      return null;
    }
  }, [router, profile]);

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      if (p) setProfile(p);
    }
  };

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // LÓGICA DE UNIFICAÇÃO (LOCK FIX):
    // Usamos apenas o listener para evitar que chamadas paralelas de getSession()
    // briguem pelo lock do navegador.
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      // console.log(`[AUTH EVENT]: ${event}`);
      
      const currentUser = currentSession?.user ?? null;
      
      // Estabilização de estado: Só atualiza se o ID do usuário mudar
      if (currentUser?.id !== user?.id || !isInitialized.current) {
        setSession(currentSession);
        setUser(currentUser);

        if (currentUser) {
          const p = await fetchProfile(currentUser.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      }

      setLoading(false);
      
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    // Fallback de segurança caso o listener demore (comum no Next.js 15)
    const checkInitialSession = async () => {
      if (loading) {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s && !user) {
          setSession(s);
          setUser(s.user);
          const p = await fetchProfile(s.user.id);
          setProfile(p);
          setLoading(false);
        }
      }
    };
    
    const timeout = setTimeout(checkInitialSession, 1500);

    return () => {
      clearTimeout(timeout);
      authListener?.subscription.unsubscribe();
    };
  }, [fetchProfile, router, user?.id, loading]);

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
