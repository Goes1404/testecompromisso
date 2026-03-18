'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured, safeExecute } from '@/app/lib/supabase';
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
  const authInitialized = useRef(false);
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
    try {
      const { data, error } = await safeExecute(() => 
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      );

      if (error) throw error;

      if (data) {
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
  }, [router]);

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfile(user.id);
      if (p) setProfile(p);
    }
  };

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    const initAuth = async () => {
      try {
        // No Next.js 15, evitamos chamar getSession e onAuthStateChange em paralelo para não quebrar o Lock
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          const currentUser = currentSession?.user ?? null;
          
          if (currentUser?.id !== user?.id || !profile) {
            setSession(currentSession);
            setUser(currentUser);
            if (currentUser) {
              const p = await fetchProfile(currentUser.id);
              setProfile(p);
            } else {
              setProfile(null);
            }
          }

          if (event === 'SIGNED_OUT') {
            router.replace('/login');
          }
          
          setLoading(false);
        });

        return authListener;
      } catch (e) {
        console.error("Auth critical initialization failure:", e);
        setLoading(false);
      }
    };

    const listenerPromise = initAuth();

    return () => {
      listenerPromise.then(l => l?.subscription.unsubscribe());
    };
  }, [fetchProfile, router, user?.id, profile]);

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
