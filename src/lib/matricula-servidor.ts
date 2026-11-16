/**
 * Matrícula 2027 — parte do servidor (service_role). Só importar em rotas /api.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  ANO_MATRICULA, Ficha, paraOBanco, validarFicha, hojeNaEscola, ErrosDaFicha, SituacaoDaInscricao, FOCOS_NA_FICHA_ONLINE,
} from "@/lib/matricula";

export function supabaseServico(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Campos que a API aceita (o resto do corpo é ignorado). */
const CAMPOS: (keyof Ficha)[] = [
  "nome", "nascimento", "celular", "email", "bairro", "cidade", "foco", "serie", "escola", "escola_tipo",
  "turno_escola", "ja_fez_cursinho", "ex_aluno", "resp_nome", "resp_parentesco", "resp_celular",
  "como_conheceu", "aceite_veracidade", "aceite_dados", "aceite_imagem", "sala_origem",
];

export function fichaDoCorpo(corpo: unknown): Ficha {
  const c = (corpo && typeof corpo === "object" ? corpo : {}) as Record<string, unknown>;
  const f: Record<string, unknown> = {};
  for (const k of CAMPOS) {
    const v = c[k];
    f[k] = typeof v === "boolean" ? v : typeof v === "string" ? v.slice(0, 200) : k.startsWith("aceite_") || k === "ja_fez_cursinho" || k === "ex_aluno" ? false : "";
  }
  return f as unknown as Ficha;
}

export type ResultadoDoRegistro =
  | { ok: true; protocolo: string; inscricao: SituacaoDaInscricao | null }
  | { ok: false; status: number; erro: string; erros?: ErrosDaFicha };

/** Valida e grava pela função do banco (que confere janela, número e repetida). */
export async function registrar(
  supa: SupabaseClient,
  ficha: Ficha,
  origem: "site" | "secretaria",
): Promise<ResultadoDoRegistro> {
  const { erros, limpa } = validarFicha(ficha, hojeNaEscola());
  if (Object.keys(erros).length) return { ok: false, status: 400, erro: "Confira os campos marcados.", erros };
  if (origem === "site" && !FOCOS_NA_FICHA_ONLINE.includes(limpa.foco as never)) {
    return { ok: false, status: 400, erro: "A ficha online é só para o Vestibulinho ETEC. Para o ENEM, procure a secretaria.", erros: { foco: "Só ETEC pela internet." } };
  }
  const { data, error } = await supa.rpc("registrar_matricula", { p: paraOBanco(limpa, ANO_MATRICULA), p_origem: origem });
  if (error) {
    // Mensagens P0001 do banco são escritas para quem preenche; o resto não.
    const doBanco = error.code === "P0001" && error.message;
    return { ok: false, status: doBanco ? 400 : 500, erro: doBanco || "Não deu para registrar agora. Tente de novo em alguns minutos." };
  }
  const protocolo = String(data);
  // A sala já foi decidida pelo banco na inscrição; a consulta traz sala ou lugar na fila.
  const inscricao = await consultar(supa, protocolo, limpa.nascimento);
  return { ok: true, protocolo, inscricao };
}

/** Nome completo OU protocolo, sempre com a data de nascimento. Null = não achou. */
export async function consultar(
  supa: SupabaseClient,
  busca: string,
  nascimento: string,
): Promise<SituacaoDaInscricao | null> {
  const { data, error } = await supa.rpc("consultar_inscricao", {
    p_ano: ANO_MATRICULA, p_busca: busca.slice(0, 120), p_nascimento: nascimento,
  });
  if (error || !data) return null;
  return data as SituacaoDaInscricao;
}
