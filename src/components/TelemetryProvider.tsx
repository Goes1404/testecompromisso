'use client';

/**
 * Liga a telemetria à sessão e registra cada troca de tela.
 *
 * Fica montado no layout do dashboard, acima de tudo que o aluno usa. Não
 * renderiza nada e não bloqueia nenhum fluxo — se a telemetria falhar, a tela
 * continua funcionando exatamente como antes.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { identificar, trackTela, flush } from '@/lib/telemetry';

export function TelemetryProvider() {
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    identificar(user?.id ?? null);
    // Ao sair (logout ou desmontagem), descarrega o que ficou na fila.
    return () => { void flush(); };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !pathname) return;
    trackTela(pathname);
  }, [pathname, user?.id]);

  return null;
}
