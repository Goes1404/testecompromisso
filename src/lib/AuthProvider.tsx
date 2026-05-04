
'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/app/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

/**
 * 🔒 PROVEDOR DE IDENTIDADE INDUSTRIAL - COMPROMISSO 360
 * Versão Estabilizada: Elimina travamentos de sincronização e melhora a resiliência do perfil.
 */

type UserRole = 'admin' | 'teacher' | 'student' | 'staff';

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
    // PRIORIDADE 1: campo `role` explícito no perfil — fonte mais confiável
    if (profile?.role) {
      const r = profile.role.toLowerCase().trim();
      if (r === 'admin' || r === 'staff' || r === 'teacher' || r === 'student') return r as UserRole;
      if (['gestor', 'coordenador', 'coordenação', 'coordenacao', 'administrador'].includes(r)) return 'admin';
      if (['tecnico', 'técnico', 'assistente', 'suporte', 'secretaria'].includes(r)) return 'staff';
      if (['mentor', 'professor', 'docente'].includes(r)) return 'teacher';
    }

    // PRIORIDADE 2: campo `profile_type` — mapeamento explícito, sem inferência
    if (profile?.profile_type) {
      const pt = profile.profile_type.toLowerCase().trim();
      if (['admin', 'gestor', 'coordenador', 'coordenação', 'coordenacao', 'administrador'].includes(pt)) return 'admin';
      if (['staff', 'tecnico', 'técnico', 'equipe técnica', 'assistente', 'suporte'].includes(pt)) return 'staff';
      if (['teacher', 'mentor', 'professor', 'docente'].includes(pt)) return 'teacher';
    }

    // PRIORIDADE 3: user_metadata.role — apenas valores explícitos, sem inferência por e-mail
    if (user?.user_metadata?.role) {
      const r = (user.user_metadata.role as string).toLowerCase().trim();
      if (r === 'admin' || r === 'staff' || r === 'teacher' || r === 'student') return r as UserRole;
    }

    // Padrão seguro: menor privilégio
    return 'student';
  }, [profile, user]);

  const fetchProfile = useCallback(async (userId: string, retries = 1, delayMs = 500) => {
    if (!isSupabaseConfigured || !userId) return null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Consulta com tratamento de erro
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.warn(`[AUTH] Tentativa ${attempt + 1} falhou: ${error.message}`);
          if (attempt === retries - 1) return null;
        }

        if (data) {
          if (data.status === 'suspended') {
            router.replace('/suspended');
            return null;
          }
          return data as Profile;
        }
        
        // Se não encontrou o perfil e ainda há tentativas, espera antes de tentar de novo
        // Isso resolve o bug do "loading infinito" causado pelo delay do trigger no banco
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

      } catch (err: any) {
        const errorMsg = err?.message || JSON.stringify(err);
        console.error(`[AUTH] Erro na tentativa ${attempt + 1}:`, errorMsg);
        if (attempt === retries - 1) return null;
      }
    }
    
    return null;
  }, [router]);

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfile(user.id, 1); // Sem retry no refresh manual
      if (p) setProfile(p);
    }
  };

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
    window.location.assign("/login");
  }, []);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    async function initAuth() {
      if (authInitialized.current) return;
      authInitialized.current = true;

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          // ⚡ NÃO esperamos o perfil para destravar o loading
          fetchProfile(initialSession.user.id).then(p => setProfile(p));
        }
      } catch (e: any) {
        console.error("[AUTH] Erro ao inicializar sessão:", e?.message || e);
      } finally {
        setLoading(false);
      }

      const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        const currentUser = currentSession?.user ?? null;
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUser(null);
          setSession(null);
          router.replace('/login');
          return;
        }

        setUser(currentUser);
        setSession(currentSession);

        if (currentUser) {
          const p = await fetchProfile(currentUser.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      });
      
      subscription = data.subscription;
    }

    initAuth();

    // 🔒 Verificação de Sessão Única (Anti-Compartilhamento)
    const checkSessionLock = () => {
      if (profile?.bio) {
        const localSessionId = localStorage.getItem('comp_session_id');
        if (localSessionId && profile.bio !== localSessionId) {
          console.warn("[SECURITY] Sessão invalidada por novo login em outro dispositivo.");
          signOut();
        }
      }
    };

    // Checa a cada mudança de perfil
    checkSessionLock();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchProfile, router, profile, signOut]);

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
