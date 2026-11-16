/**
 * Link da porta da conferência rápida (dia do simulado), sem login.
 * SÓ SERVIDOR — nunca importe em componente cliente.
 *
 * A tela da porta mostra nome e nascimento de alunos menores, então ela não
 * fica aberta para qualquer um: quem tem login de admin/staff gera um link com
 * uma chave assinada que vence sozinha (`VALIDADE_DA_PORTA_HORAS`) e manda para
 * os fiscais. Sem a chave (ou com ela vencida), a rota não devolve nada.
 *
 * Formato: base64url("<expiraEmMs>.<nonce>") + "." + base64url(HMAC-SHA256(
 * "conferencia:v1:" + payload)). O prefixo separa este token do link de senha,
 * que usa o mesmo segredo.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { segredoDoLink } from "@/lib/link-de-senha-token";

export const VALIDADE_DA_PORTA_HORAS = 72;
const DOMINIO = "conferencia:v1:";

const assinatura = (payload: string, segredo: string) =>
  createHmac("sha256", segredo).update(DOMINIO + payload).digest("base64url");

export function assinarLinkDaPorta(agora = Date.now()): { token: string; expiraEm: Date } | null {
  const segredo = segredoDoLink();
  if (!segredo) return null;
  const expira = agora + VALIDADE_DA_PORTA_HORAS * 3_600_000;
  const payload = Buffer.from(`${expira}.${randomBytes(9).toString("base64url")}`).toString("base64url");
  return { token: `${payload}.${assinatura(payload, segredo)}`, expiraEm: new Date(expira) };
}

/** true só com assinatura certa e dentro da validade. */
export function linkDaPortaValido(token: string | null | undefined, agora = Date.now()): boolean {
  const segredo = segredoDoLink();
  if (!segredo || !token || token.length > 300) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const esperado = Buffer.from(assinatura(payload, segredo));
  const recebido = Buffer.from(sig);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return false;
  const expira = Number(Buffer.from(payload, "base64url").toString().split(".")[0]);
  return Number.isFinite(expira) && agora < expira;
}
