/**
 * Link de senha que a secretaria gera para um aluno (`/api/admin/generate-link`)
 * e que a tela `/reset-password` lê. Serve para os dois casos:
 *
 * - **primeiro acesso** ("Link de Primeiro Acesso", logo depois de criar o
 *   usuário): o aluno cria a própria senha;
 * - **redefinir** ("Gerar Link de Reset"): o aluno troca uma senha esquecida.
 *
 * Os dois são o MESMO tipo de token no Supabase (`recovery`), por três motivos
 * verificados em 16/10:
 *
 * 1. O convite do Supabase (`invite`) só existe para conta que ainda não
 *    existe. Aqui a conta é sempre criada antes (`create-user`, com
 *    `email_confirm: true`), e o Supabase recusava gerar o convite com "e-mail
 *    já cadastrado" — o "Link de Primeiro Acesso" nunca saía.
 * 2. Com `recovery`, o mesmo link vale para quem nunca entrou e para quem
 *    esqueceu a senha. É o que a coordenação pediu: o convite também redefine.
 * 3. O link aponta para a NOSSA tela levando só o `token_hash`, e o token é
 *    trocado por sessão no clique (`verifyOtp`). O link antigo do Supabase
 *    entregava a sessão no `#access_token`, que o cliente da plataforma (fluxo
 *    PKCE, padrão do `@supabase/ssr`) recusa: todo link caía em "Link
 *    expirado". E a prévia do WhatsApp abre o endereço para montar o cartão —
 *    com o token trocado só no clique, a prévia não queima o link.
 *
 * Tudo aqui é puro para caber em `scripts/test-link-de-senha.ts`.
 */

export type FinalidadeDoLink = "primeiro-acesso" | "redefinir";

/** O tipo de token do Supabase usado nas duas finalidades (ver acima). */
export const TIPO_DO_TOKEN = "recovery" as const;

/** O Supabase gera hash hexadecimal; aceitamos um alfabeto seguro e folgado. */
const TOKEN_HASH = /^[A-Za-z0-9_-]{16,256}$/;
/** Tokens JWT de sessão do link antigo (`#access_token=…`). */
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function finalidadeDe(valor: string | null | undefined): FinalidadeDoLink {
  return valor === "primeiro-acesso" || valor === "invite" ? "primeiro-acesso" : "redefinir";
}

/**
 * Origem para montar o link. Vem do cabeçalho `Origin` do pedido da secretaria
 * (é a mesma aba da plataforma), com reserva no `NEXT_PUBLIC_APP_URL`. Só aceita
 * http(s) e devolve só protocolo + host: nada de caminho ou parâmetro colado.
 */
export function origemDoLink(origin: string | null | undefined, reserva: string | null | undefined): string {
  for (const candidato of [origin, reserva]) {
    if (!candidato) continue;
    try {
      const u = new URL(candidato);
      if (u.protocol === "https:" || u.protocol === "http:") return u.origin;
    } catch {
      // segue para o próximo
    }
  }
  return "http://localhost:3000";
}

export function montarLinkDeSenha(origem: string, tokenHash: string, finalidade: FinalidadeDoLink): string {
  const p = new URLSearchParams({ token_hash: tokenHash, type: TIPO_DO_TOKEN, para: finalidade });
  return `${origem}/reset-password?${p.toString()}`;
}

export type LeituraDoLink =
  /** Link novo: troca o `token_hash` por sessão no clique. */
  | { tipo: "token"; tokenHash: string; finalidade: FinalidadeDoLink }
  /** Link antigo, já emitido antes da correção: sessão pronta no `#`. */
  | { tipo: "sessao"; accessToken: string; refreshToken: string; finalidade: FinalidadeDoLink }
  /** O Supabase devolveu erro no endereço (link vencido, já usado…). */
  | { tipo: "erro"; mensagem: string }
  /** Ninguém chega aqui sem link. */
  | { tipo: "nenhum" };

function semPrefixo(s: string, prefixo: string): string {
  return s.startsWith(prefixo) ? s.slice(prefixo.length) : s;
}

/**
 * Lê `location.search` e `location.hash`. A ordem importa: erro no endereço
 * vence tudo (o Supabase manda `error_code` no `#` quando o link já venceu),
 * depois o link novo, depois o antigo.
 */
export function lerLinkDeSenha(search: string, hash: string): LeituraDoLink {
  const q = new URLSearchParams(semPrefixo(search ?? "", "?"));
  const h = new URLSearchParams(semPrefixo(hash ?? "", "#"));

  const codigoDoErro = h.get("error_code") || q.get("error_code");
  const textoDoErro = h.get("error_description") || q.get("error_description");
  if (codigoDoErro || textoDoErro || h.get("error") || q.get("error")) {
    return { tipo: "erro", mensagem: mensagemDoErroDoLink(codigoDoErro, textoDoErro) };
  }

  const finalidade = finalidadeDe(q.get("para") || q.get("type") || h.get("type"));

  const tokenHash = q.get("token_hash");
  if (tokenHash) {
    return TOKEN_HASH.test(tokenHash)
      ? { tipo: "token", tokenHash, finalidade }
      : { tipo: "erro", mensagem: mensagemDoErroDoLink("link_quebrado", null) };
  }

  const accessToken = h.get("access_token");
  const refreshToken = h.get("refresh_token");
  if (accessToken || refreshToken) {
    return accessToken && refreshToken && JWT.test(accessToken) && /^[A-Za-z0-9_-]{6,}$/.test(refreshToken)
      ? { tipo: "sessao", accessToken, refreshToken, finalidade }
      : { tipo: "erro", mensagem: mensagemDoErroDoLink("link_quebrado", null) };
  }

  return { tipo: "nenhum" };
}

/** Texto para o aluno: o que houve e o que fazer. Nunca o erro cru do servidor. */
export function mensagemDoErroDoLink(codigo: string | null | undefined, texto?: string | null): string {
  const c = (codigo ?? "").toLowerCase();
  const t = (texto ?? "").toLowerCase();
  if (c === "otp_expired" || c === "flow_state_expired" || t.includes("expired") || t.includes("invalid")) {
    return "Este link já foi usado ou passou do prazo de 1 hora. Peça um link novo à secretaria.";
  }
  if (c === "link_quebrado") {
    return "O link chegou incompleto. Copie o link inteiro da mensagem ou peça outro à secretaria.";
  }
  if (c === "over_request_rate_limit" || c === "over_email_send_rate_limit" || t.includes("rate limit")) {
    return "Muitas tentativas seguidas. Espere alguns minutos e abra o link de novo.";
  }
  if (c === "user_banned") {
    return "Esta conta está bloqueada. Fale com a secretaria.";
  }
  return "Não foi possível validar este link. Peça um link novo à secretaria.";
}

/** Os mesmos requisitos que a tela mostra. */
export function requisitosDaSenha(senha: string) {
  return {
    tamanho: senha.length >= 8,
    maiuscula: /[A-Z]/.test(senha),
    numero: /[0-9]/.test(senha),
    simbolo: /[^A-Za-z0-9]/.test(senha),
  };
}

export function senhaAtendeRequisitos(senha: string): boolean {
  const r = requisitosDaSenha(senha);
  return r.tamanho && r.maiuscula && r.numero && r.simbolo;
}
