import { NextResponse } from "next/server";
import { supabaseServico } from "@/lib/matricula-servidor";
import { ANO_MATRICULA, numeroDeInscricao } from "@/lib/matricula";
import { corrigir, respostasDe } from "@/lib/correcao-gabarito";
import { ResultadoPublico, questoesDoResultado } from "@/lib/simulado-resultado";

/**
 * Resultado do Simulado Pré-Etec, público (sem login) — o link `/resultado`.
 *
 * POST { busca, nascimento } → { resultado } ou 404.
 * Mesma chave da consulta da inscrição: nome completo exato OU número de
 * inscrição, sempre com a data de nascimento (sem ela, qualquer um veria a
 * nota de qualquer colega só pelo nome). Devolve primeiro nome, nº, sala, a
 * nota e questão a questão — nada de celular, escola ou responsável.
 * 40 consultas por IP por hora (uma turma inteira consulta do mesmo Wi-Fi).
 */
export const dynamic = "force-dynamic";

const LIMITE_POR_HORA = 40;

export async function POST(request: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const busca = typeof corpo.busca === "string" ? corpo.busca.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  const nascimento = typeof corpo.nascimento === "string" ? corpo.nascimento.trim() : "";
  if (!busca || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
    return NextResponse.json({ error: "Preencha o nome completo (ou o número de inscrição) e a data de nascimento." }, { status: 400 });
  }

  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ error: "Consulta indisponível no momento." }, { status: 503 });

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || request.headers.get("x-real-ip") || "desconhecido";
  try {
    const desde = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await supa
      .from("password_reset_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("identifier", "simulado_resultado")
      .gte("created_at", desde);
    if ((count ?? 0) >= LIMITE_POR_HORA) {
      return NextResponse.json({ error: "Muitas consultas deste local na última hora. Tente mais tarde ou procure a secretaria." }, { status: 429 });
    }
    await supa.from("password_reset_attempts").insert({ ip, identifier: "simulado_resultado", success: true });
  } catch {
    // Tabela de tentativas fora do ar: segue, a consulta exige nome exato + nascimento.
  }

  const [achado, gabarito] = await Promise.all([
    supa.rpc("resultado_do_simulado", { p_ano: ANO_MATRICULA, p_busca: busca, p_nascimento: nascimento }),
    supa.from("simulado_gabaritos").select("chave").eq("ano", ANO_MATRICULA).maybeSingle(),
  ]);
  if (achado.error) {
    // Função ainda não existe no banco = os resultados não foram publicados.
    return NextResponse.json({ error: "Os resultados ainda não foram publicados. Volte mais tarde." }, { status: 503 });
  }
  const d = achado.data as { protocolo: string; primeiro_nome: string; sala: number | null; respostas: unknown } | null;
  if (!d) {
    return NextResponse.json(
      { error: "Não achamos nenhuma inscrição com esses dados. Confira o nome completo (como na ficha) e a data de nascimento, ou use o número de inscrição." },
      { status: 404 },
    );
  }

  const base = { primeiro_nome: d.primeiro_nome, numero: numeroDeInscricao(d.protocolo), sala: d.sala };
  const chave = gabarito.data ? respostasDe(gabarito.data.chave) : null;
  if (!chave?.length || !Array.isArray(d.respostas)) {
    const vazio: ResultadoPublico = { ...base, lancado: false, acertos: 0, total: 0, questoes: [] };
    return NextResponse.json({ resultado: vazio });
  }
  // A nota é refeita aqui com a mesma `corrigir()` da tela da equipe: nunca um número guardado e velho.
  const respostas = respostasDe(d.respostas, chave.length);
  const c = corrigir(chave, respostas);
  const resultado: ResultadoPublico = { ...base, lancado: true, acertos: c.acertos, total: c.total, questoes: questoesDoResultado(chave, respostas) };
  return NextResponse.json({ resultado });
}
