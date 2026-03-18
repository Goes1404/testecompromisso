
'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

/**
 * 🔒 PROVEDOR DE IDENTIDADE INDUSTRIAL - COMPROMISSO 360
 * Versão Estabilizada: Elimina travamentos de sincronização e melhora a resiliência do perfil.
 */

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
      // Consulta com tratamento de erro amigável
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Se a tabela não existe ou há erro de RLS, logamos como aviso detalhado
        console.warn(`[AUTH] Tentativa de busca de perfil falhou: ${error.message || 'Erro de permissão ou infraestrutura'}`);
        return null;
      }

      if (data) {
        if (data.status === 'suspended') {
          router.replace('/suspended');
          return null;
        }
        return data as Profile;
      }
      
      // Se não encontrou o perfil, pode ser um novo usuário (trigger do banco ainda rodando)
      return null;
    } catch (err: any) {
      // Captura erros inesperados de rede ou execução, extraindo a mensagem se possível
      const errorMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      console.error('[AUTH] Erro inesperado ao buscar perfil:', errorMsg);
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

    async function initAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          const p = await fetchProfile(initialSession.user.id);
          setProfile(p);
        }
      } catch (e: any) {
        console.error("[AUTH] Erro ao inicializar sessão:", e?.message || e);
      } finally {
        setLoading(false);
      }

      supabase.auth.onAuthStateChange(async (event, currentSession) => {
        const currentUser = currentSession?.user ?? null;
        
        setUser(currentUser);
        setSession(currentSession);

        if (currentUser) {
          const p = await fetchProfile(currentUser.id);
          setProfile(p);
        } else {
          setProfile(null);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          router.replace('/login');
        }
      });
    }

    initAuth();
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
    window.location.assign("/login");
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
