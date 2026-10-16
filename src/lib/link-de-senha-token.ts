/**
 * Token do link de senha que a secretaria gera (primeiro acesso e redefinição).
 * SÓ SERVIDOR — nunca importe em componente cliente.
 *
 * Por que não o token do Supabase: ele é sempre de uso único e vence em 1 h
 * (configuração do Auth). A coordenação pediu (16/10) um link que vale 24 h e
 * funciona várias vezes — o aluno abre, fecha, a prévia do WhatsApp abre, ele
 * volta no dia seguinte. Então a plataforma assina o próprio link.
 *
 * Travas, já que o link deixa de ser de uso único:
 *   - versão: cada link novo para o mesmo aluno incrementa
 *     `app_metadata.link_senha_versao` e invalida os anteriores (o aluno não
 *     escreve em `app_metadata`);
 *   - a rota que grava a senha limita trocas por link e por IP e avisa o aluno
 *     no sininho a cada troca (`/api/auth/link-de-senha`).
 *
 * Formato: base64url("<userId>.<expiraEmMs>.<versao>.<nonce>") + "." +
 * base64url(HMAC-SHA256("link-senha:v1:" + payload)). O prefixo separa este
 * token do token do SMS, que usa um segredo que pode ser o mesmo.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const VALIDADE_DO_LINK_HORAS = 24;

const DOMINIO = 'link-senha:v1:';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `LINK_SENHA_SECRET`, ou o segredo do SMS. Nunca a service role key. */
export function segredoDoLink(): string | null {
  const s = process.env.LINK_SENHA_SECRET?.trim() || process.env.PASSWORD_RESET_TOKEN_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

function assinatura(payload: string, segredo: string): string {
  return createHmac('sha256', segredo).update(DOMINIO + payload).digest('base64url');
}

export function assinarLinkDeSenha(
  userId: string,
  versao: number,
  opcoes: { agora?: number; horas?: number; segredo?: string } = {},
): string {
  const segredo = opcoes.segredo ?? segredoDoLink();
  if (!segredo) throw new Error('Defina LINK_SENHA_SECRET (16+ caracteres) no servidor.');
  if (!UUID.test(userId)) throw new Error('userId inválido');
  const expira = (opcoes.agora ?? Date.now()) + (opcoes.horas ?? VALIDADE_DO_LINK_HORAS) * 3_600_000;
  const nonce = randomBytes(9).toString('base64url');
  const payload = `${userId}.${expira}.${Math.max(1, Math.floor(versao))}.${nonce}`;
  return `${Buffer.from(payload).toString('base64url')}.${assinatura(payload, segredo)}`;
}

export type ConferenciaDoLink =
  | { ok: true; userId: string; versao: number; expiraEm: number }
  | { ok: false; motivo: 'invalido' | 'expirado' };

export function conferirLinkDeSenha(
  token: string | null | undefined,
  opcoes: { agora?: number; segredo?: string } = {},
): ConferenciaDoLink {
  try {
    const segredo = opcoes.segredo ?? segredoDoLink();
    if (!segredo || !token || token.length > 600) return { ok: false, motivo: 'invalido' };
    const partes = token.split('.');
    if (partes.length !== 2) return { ok: false, motivo: 'invalido' };
    const payload = Buffer.from(partes[0], 'base64url').toString('utf8');

    const esperada = Buffer.from(assinatura(payload, segredo));
    const recebida = Buffer.from(partes[1]);
    if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) {
      return { ok: false, motivo: 'invalido' };
    }

    const [userId, expiraTxt, versaoTxt] = payload.split('.');
    const expiraEm = Number(expiraTxt);
    const versao = Number(versaoTxt);
    if (!UUID.test(userId ?? '') || !Number.isFinite(expiraEm) || !Number.isInteger(versao) || versao < 1) {
      return { ok: false, motivo: 'invalido' };
    }
    if ((opcoes.agora ?? Date.now()) > expiraEm) return { ok: false, motivo: 'expirado' };
    return { ok: true, userId, versao, expiraEm };
  } catch {
    return { ok: false, motivo: 'invalido' };
  }
}
