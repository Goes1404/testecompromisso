import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente do Cloudflare Realtime (SFU) — SÓ no servidor. O App ID e o token
 * da Cloudflare dão poder de abrir e fechar sessões de qualquer pessoa; nunca
 * vão para o navegador (regra 2 de segurança do CLAUDE.md).
 *
 * Variáveis (Vercel → Settings → Environment Variables):
 * - CLOUDFLARE_REALTIME_APP_ID
 * - CLOUDFLARE_REALTIME_APP_TOKEN
 * - CLOUDFLARE_REALTIME_URL (opcional; só para testes locais)
 */

const BASE = process.env.CLOUDFLARE_REALTIME_URL || "https://rtc.live.cloudflare.com/v1";

export function transmissaoConfigurada(): boolean {
  return !!process.env.CLOUDFLARE_REALTIME_APP_ID && !!process.env.CLOUDFLARE_REALTIME_APP_TOKEN;
}

type Sdp = { type: "offer" | "answer"; sdp: string };
type FaixaCf = {
  location?: "local" | "remote";
  mid?: string;
  trackName?: string;
  sessionId?: string;
  errorCode?: string;
  errorDescription?: string;
};

export class ErroDoCloudflare extends Error {}

async function chamar<T>(metodo: "GET" | "POST" | "PUT", caminho: string, corpo?: unknown): Promise<T> {
  const app = process.env.CLOUDFLARE_REALTIME_APP_ID!;
  const resp = await fetch(`${BASE}/apps/${app}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_REALTIME_APP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });
  const json = (await resp.json().catch(() => ({}))) as any;
  if (!resp.ok || json?.errorCode) {
    // Nunca devolve o corpo cru: pode ecoar dados da requisição.
    throw new ErroDoCloudflare(`${resp.status} ${json?.errorCode ?? ""}`.trim());
  }
  return json as T;
}

export async function novaSessao(): Promise<string> {
  const r = await chamar<{ sessionId: string }>("POST", "/sessions/new");
  if (!r.sessionId) throw new ErroDoCloudflare("sem sessionId");
  return r.sessionId;
}

/** Professor: entrega a oferta dele com as faixas locais e recebe a resposta. */
export async function publicarFaixas(sessao: string, oferta: Sdp, faixas: { mid: string; nome: string }[]): Promise<Sdp> {
  const r = await chamar<{ sessionDescription?: Sdp; tracks?: FaixaCf[] }>("POST", `/sessions/${sessao}/tracks/new`, {
    sessionDescription: oferta,
    tracks: faixas.map((f) => ({ location: "local", mid: f.mid, trackName: f.nome })),
  });
  const falhou = (r.tracks ?? []).find((t) => t.errorCode);
  if (falhou || !r.sessionDescription) throw new ErroDoCloudflare(falhou?.errorCode ?? "sem resposta");
  return r.sessionDescription;
}

/**
 * Aluno: pede as faixas do professor numa sessão nova. O Cloudflare devolve
 * uma OFERTA (o aluno responde com `renegociar`) e o `mid` de cada faixa, que
 * é como o navegador do aluno sabe qual vídeo é a tela e qual é a câmera.
 */
export async function puxarFaixas(
  sessao: string,
  sessaoDoProfessor: string,
  nomes: string[],
): Promise<{ oferta: Sdp | null; faixas: { mid: string; nome: string }[] }> {
  const r = await chamar<{ sessionDescription?: Sdp; requiresImmediateRenegotiation?: boolean; tracks?: FaixaCf[] }>(
    "POST",
    `/sessions/${sessao}/tracks/new`,
    { tracks: nomes.map((n) => ({ location: "remote", sessionId: sessaoDoProfessor, trackName: n })) },
  );
  const faixas = (r.tracks ?? [])
    .filter((t) => !t.errorCode && t.mid && t.trackName)
    .map((t) => ({ mid: String(t.mid), nome: String(t.trackName) }));
  return { oferta: r.requiresImmediateRenegotiation && r.sessionDescription ? r.sessionDescription : null, faixas };
}

export async function renegociar(sessao: string, resposta: Sdp): Promise<void> {
  await chamar("PUT", `/sessions/${sessao}/renegotiate`, { sessionDescription: resposta });
}

/**
 * Prova de que a sessão de aluno foi aberta por ESTA pessoa, para o passo
 * seguinte (`responder`) não aceitar id de sessão alheia. HMAC com o token do
 * Cloudflare, que só o servidor tem.
 */
export function assinarSessao(sessao: string, userId: string): string {
  return createHmac("sha256", process.env.CLOUDFLARE_REALTIME_APP_TOKEN || "sem-chave")
    .update(`${sessao}:${userId}`)
    .digest("base64url");
}

export function conferirAssinatura(sessao: string, userId: string, assinatura: string): boolean {
  const esperada = Buffer.from(assinarSessao(sessao, userId));
  const recebida = Buffer.from(String(assinatura || ""));
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}

/** SDP plausível: texto, começa com "v=0" e não é gigante. */
export function sdpValido(sdp: unknown): sdp is string {
  return typeof sdp === "string" && sdp.startsWith("v=0") && sdp.length < 200_000;
}
