/**
 * Emite o link de senha de 24 h para UMA conta. SÓ SERVIDOR (service role).
 * Usado pelo link avulso (`/api/admin/generate-link`) e pelo lote
 * (`/api/admin/generate-links-lote`) — os dois precisam subir a versão do mesmo
 * jeito, senão um link antigo continuaria valendo.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { assinarLinkDeSenha } from '@/lib/link-de-senha-token';
import { montarLinkDeConvite, type FinalidadeDoLink } from '@/lib/link-de-senha';

export async function emitirLinkDeSenha(
  sb: SupabaseClient,
  userId: string,
  origem: string,
  finalidade: FinalidadeDoLink,
): Promise<{ ok: true; link: string; email: string } | { ok: false; motivo: 'sem_conta' | 'falhou' }> {
  const { data: alvo, error: erroAlvo } = await sb.auth.admin.getUserById(userId);
  if (erroAlvo || !alvo?.user) return { ok: false, motivo: 'sem_conta' };

  // Versão nova cancela os links anteriores desta conta. A Admin API SUBSTITUI
  // o app_metadata: mescla. (Não mexe em user_metadata, que dispara o gatilho
  // de perfil.)
  const versao = (Number(alvo.user.app_metadata?.link_senha_versao) || 0) + 1;
  const { error } = await sb.auth.admin.updateUserById(userId, {
    app_metadata: { ...(alvo.user.app_metadata ?? {}), link_senha_versao: versao },
  });
  if (error) return { ok: false, motivo: 'falhou' };

  return {
    ok: true,
    link: montarLinkDeConvite(origem, assinarLinkDeSenha(userId, versao), finalidade),
    email: alvo.user.email ?? '',
  };
}
