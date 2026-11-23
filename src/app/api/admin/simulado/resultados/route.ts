import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exigirAdmin } from "@/lib/server-auth";
import { supabaseServico } from "@/lib/matricula-servidor";
import { carregarTudo } from "@/lib/carregar-tudo";
import { ANO_MATRICULA } from "@/lib/matricula";
import { Marca, corrigir, respostasDe } from "@/lib/correcao-gabarito";
import {
  ANO_DA_PROVA_DO_SIMULADO, TITULO_DA_PROVA_DO_SIMULADO, Conta, InscricaoParaConta, Escolha,
  avisoDaNota, chaveDoCorpo, chaveParaAProva, contasParaConferirUso, ehUuid, escolherConta, itensDoCorpo,
  mesmaChave, respostasParaAProva, MAXIMO_DE_CARTOES,
} from "@/lib/simulado-resultado";

/**
 * Notas do Simulado Pré-Etec (só admin/staff).
 *
 * GET  → gabarito guardado + o que já foi lançado.
 * POST { acao: "previa", ids }            → qual conta da plataforma é de cada inscrição.
 * POST { acao: "lancar", chave, itens }   → grava as notas (link público) e,
 *                                           para quem tem conta, na plataforma.
 * POST { acao: "apagar", matricula_id }   → tira uma nota lançada por engano.
 *
 * A nota NUNCA vem do navegador: o servidor refaz a conta com `corrigir()`.
 * `ano` nas duas tabelas é o da turma de inscrição (`ANO_MATRICULA`), a mesma
 * chave de `matriculas`.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Servico = SupabaseClient;
interface Guardado {
  matricula_id: string; respostas: unknown; acertos: number; total: number;
  perfil_id: string | null; lancado_em: string; lancado_por: string | null;
}

const semTabela = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205");
const FALTA_MIGRATION = "Falta aplicar a atualização do banco das notas do simulado. Avise o suporte.";

async function emLotes<T>(ids: string[], tamanho: number, f: (lote: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<{ data: T[]; error: unknown }> {
  const tudo: T[] = [];
  for (let i = 0; i < ids.length; i += tamanho) {
    const { data, error } = await f(ids.slice(i, i + tamanho));
    if (error) return { data: tudo, error };
    tudo.push(...(data ?? []));
  }
  return { data: tudo, error: null };
}

/** Alunos ativos da plataforma (paginado: a base passou de 1.000). */
async function carregarContas(supa: Servico): Promise<{ contas: Conta[]; error: unknown }> {
  const r = await carregarTudo<{ id: string; name: string | null; full_name: string | null; email: string | null; sala: string | null; birth_date: string | null }>(
    (de, ate) => supa.from("profiles").select("id, name, full_name, email, sala, birth_date")
      .eq("role", "student").is("arquivado_em", null).order("id").range(de, ate),
  );
  const contas = r.data
    .map((p) => ({ id: p.id, nome: p.name?.trim() || p.full_name?.trim() || "", login: p.email, sala: p.sala, nascimento: p.birth_date, usada: null as boolean | null }))
    .filter((c) => c.nome);
  return { contas, error: r.error };
}

/** "Já entrou alguma vez?" — só para as contas de nome repetido, que é onde isso desempata. */
async function marcarUso(supa: Servico, contas: Conta[], ids: string[]) {
  const porId = new Map(contas.map((c) => [c.id, c]));
  const alvo = ids.slice(0, 300);
  for (let i = 0; i < alvo.length; i += 10) {
    await Promise.all(alvo.slice(i, i + 10).map(async (id) => {
      try {
        const { data } = await supa.auth.admin.getUserById(id);
        const c = porId.get(id);
        if (c && data?.user) c.usada = !!data.user.last_sign_in_at;
      } catch { /* sem resposta: fica "não conferido" e a tela pede para escolher */ }
    }));
  }
}

async function carregarGuardados(supa: Servico) {
  return carregarTudo<Guardado>((de, ate) =>
    supa.from("simulado_resultados").select("matricula_id, respostas, acertos, total, perfil_id, lancado_em, lancado_por")
      .eq("ano", ANO_MATRICULA).order("matricula_id").range(de, ate));
}

async function idDaProva(supa: Servico): Promise<string | null> {
  const { data } = await supa.from("exams").select("id").eq("title", TITULO_DA_PROVA_DO_SIMULADO)
    .eq("exam_type", "simulado_importado").order("created_at").limit(1);
  return data?.[0]?.id ?? null;
}

/** A prova em `exams` (cria na primeira vez) com o gabarito atual. */
async function garantirProva(supa: Servico, chave: Marca[]): Promise<string> {
  const answer_key = chaveParaAProva(chave);
  const id = await idDaProva(supa);
  if (id) {
    const { error } = await supa.from("exams").update({ answer_key }).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }
  const { data, error } = await supa.from("exams")
    .insert({ title: TITULO_DA_PROVA_DO_SIMULADO, year: ANO_DA_PROVA_DO_SIMULADO, exam_type: "simulado_importado", answer_key, description: "Notas lançadas pela correção por foto." })
    .select("id").single();
  if (error || !data) throw new Error(error?.message || "Não deu para criar a prova.");
  return data.id;
}

/** Tira o lançamento oficial (source='teacher') destes alunos nesta prova. Não toca em tentativa do próprio aluno. */
async function tirarDaPlataforma(supa: Servico, examId: string, userIds: string[]) {
  for (let i = 0; i < userIds.length; i += 100) {
    const { error } = await supa.from("exam_attempts").delete().eq("exam_id", examId).eq("source", "teacher").in("user_id", userIds.slice(i, i + 100));
    if (error) throw new Error(error.message);
  }
}

export async function GET() {
  const auth = await exigirAdmin();
  if (auth.negado) return auth.negado;
  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ error: "Servidor sem acesso ao banco." }, { status: 503 });

  const gab = await supa.from("simulado_gabaritos").select("chave, atualizado_em").eq("ano", ANO_MATRICULA).maybeSingle();
  if (semTabela(gab.error)) return NextResponse.json({ faltaMigration: true, gabarito: null, resultados: [] });
  if (gab.error) return NextResponse.json({ error: "Não deu para ler as notas lançadas." }, { status: 500 });
  const res = await carregarGuardados(supa);
  if (res.error) return NextResponse.json({ error: "Não deu para ler as notas lançadas." }, { status: 500 });
  return NextResponse.json({
    gabarito: gab.data ? respostasDe(gab.data.chave) : null,
    resultados: res.data.map((r) => ({ matricula_id: r.matricula_id, acertos: r.acertos, total: r.total, perfil_id: r.perfil_id, lancado_em: r.lancado_em })),
  });
}

export async function POST(request: Request) {
  const auth = await exigirAdmin();
  if (auth.negado) return auth.negado;
  const supa = supabaseServico();
  if (!supa) return NextResponse.json({ error: "Servidor sem acesso ao banco." }, { status: 503 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  // ── Qual conta é de cada inscrição ────────────────────────────────────────
  if (corpo.acao === "previa") {
    const ids = Array.isArray(corpo.ids) ? [...new Set(corpo.ids.filter(ehUuid))].slice(0, MAXIMO_DE_CARTOES) : [];
    if (!ids.length) return NextResponse.json({ escolhas: {} });

    const [insc, { contas, error: erroContas }, guardados] = await Promise.all([
      emLotes<InscricaoParaConta>(ids, 100, (lote) =>
        supa.from("matriculas").select("id, nome, nascimento, sala_origem, ex_aluno").eq("ano", ANO_MATRICULA).in("id", lote)),
      carregarContas(supa),
      carregarGuardados(supa),
    ]);
    if (semTabela(guardados.error as never)) return NextResponse.json({ error: FALTA_MIGRATION }, { status: 503 });
    if (insc.error || erroContas) return NextResponse.json({ error: "Não deu para conferir as contas agora." }, { status: 500 });

    await marcarUso(supa, contas, contasParaConferirUso(insc.data, contas));
    const porId = new Map(contas.map((c) => [c.id, c]));
    const jaLigada = new Map(guardados.data.filter((g) => g.perfil_id).map((g) => [g.matricula_id, g.perfil_id!]));
    const lancadas = new Set(guardados.data.map((g) => g.matricula_id));

    const escolhas: Record<string, Escolha & { lancada: boolean }> = {};
    for (const i of insc.data) {
      const e = escolherConta(i, contas);
      // Escolha feita à mão num lançamento anterior vale mais que a regra.
      const antiga = porId.get(jaLigada.get(i.id) ?? "");
      escolhas[i.id] = antiga && antiga.id !== e.conta?.id
        ? { situacao: "conta", conta: antiga, candidatos: [antiga, ...e.candidatos.filter((c) => c.id !== antiga.id)], motivo: "Escolhida no lançamento anterior", lancada: true }
        : { ...e, lancada: lancadas.has(i.id) };
    }
    return NextResponse.json({ escolhas });
  }

  // ── Lançar ────────────────────────────────────────────────────────────────
  if (corpo.acao === "lancar") {
    const chave = chaveDoCorpo(corpo.chave);
    if (!chave) return NextResponse.json({ error: "Gabarito inválido. Confira o gabarito antes de lançar." }, { status: 400 });
    const lidos = itensDoCorpo(corpo.itens, chave.length);
    if (lidos.erro !== undefined) return NextResponse.json({ error: lidos.erro }, { status: 400 });
    const itens = lidos.itens;
    const avisos: string[] = [];

    const ids = itens.map((i) => i.matricula_id);
    const [existentes, gabAnterior, guardados, { contas, error: erroContas }] = await Promise.all([
      emLotes<{ id: string }>(ids, 100, (lote) => supa.from("matriculas").select("id").eq("ano", ANO_MATRICULA).in("id", lote)),
      supa.from("simulado_gabaritos").select("chave").eq("ano", ANO_MATRICULA).maybeSingle(),
      carregarGuardados(supa),
      carregarContas(supa),
    ]);
    if (semTabela(gabAnterior.error) || semTabela(guardados.error as never)) return NextResponse.json({ error: FALTA_MIGRATION }, { status: 503 });
    if (existentes.error || gabAnterior.error || guardados.error || erroContas) {
      return NextResponse.json({ error: "Não deu para lançar agora. Tente de novo." }, { status: 500 });
    }
    if (existentes.data.length !== ids.length) {
      return NextResponse.json({ error: "Há cartão de uma inscrição que não existe mais. Recarregue a tela." }, { status: 400 });
    }

    // Conta só vale se for de aluno ativo, e uma conta só recebe uma nota.
    const contaValida = new Set(contas.map((c) => c.id));
    const noLote = new Set(ids);
    const anterior = new Map(guardados.data.map((g) => [g.matricula_id, g]));
    const contaDeOutro = new Set(guardados.data.filter((g) => g.perfil_id && !noLote.has(g.matricula_id)).map((g) => g.perfil_id!));
    let recusadas = 0;
    for (const i of itens) {
      if (i.perfil_id && (!contaValida.has(i.perfil_id) || contaDeOutro.has(i.perfil_id))) { i.perfil_id = null; recusadas++; }
    }
    if (recusadas) avisos.push(`${recusadas} conta(s) não puderam ser ligadas (arquivada, ou já com a nota de outra inscrição). A nota ficou só no link.`);

    const agora = new Date().toISOString();
    const linhas = itens.map((i) => {
      const c = corrigir(chave, i.respostas);
      return { matricula_id: i.matricula_id, ano: ANO_MATRICULA, respostas: i.respostas, acertos: c.acertos, total: c.total, perfil_id: i.perfil_id, lancado_em: agora, lancado_por: auth.user.id };
    });

    // Gabarito mudou: as notas lançadas antes (de outros cartões) são refeitas.
    const chaveMudou = !!gabAnterior.data && !mesmaChave(gabAnterior.data.chave, chave);
    let refeitas = 0;
    if (chaveMudou) {
      for (const g of guardados.data) {
        if (noLote.has(g.matricula_id)) continue;
        const respostas = respostasDe(g.respostas, chave.length);
        const c = corrigir(chave, respostas);
        linhas.push({ matricula_id: g.matricula_id, ano: ANO_MATRICULA, respostas, acertos: c.acertos, total: c.total, perfil_id: g.perfil_id, lancado_em: g.lancado_em, lancado_por: g.lancado_por ?? auth.user.id });
        refeitas++;
      }
      if (refeitas) avisos.push(`O gabarito mudou: ${refeitas} nota(s) lançada(s) antes foram refeitas.`);
    }

    const gab = await supa.from("simulado_gabaritos").upsert(
      { ano: ANO_MATRICULA, titulo: TITULO_DA_PROVA_DO_SIMULADO, chave, atualizado_em: agora, atualizado_por: auth.user.id }, { onConflict: "ano" });
    if (gab.error) return NextResponse.json({ error: "Não deu para guardar o gabarito." }, { status: 500 });

    // Quem troca de conta solta a antiga antes (uma conta, uma nota — o índice único recusaria no meio do lote).
    const trocaram = itens.filter((i) => { const a = anterior.get(i.matricula_id); return a?.perfil_id && a.perfil_id !== i.perfil_id; });
    if (trocaram.length) {
      const r = await emLotes(trocaram.map((i) => i.matricula_id), 100, (lote) =>
        supa.from("simulado_resultados").update({ perfil_id: null }).in("matricula_id", lote).select("matricula_id"));
      if (r.error) return NextResponse.json({ error: "Não deu para lançar agora. Tente de novo." }, { status: 500 });
    }
    for (let i = 0; i < linhas.length; i += 200) {
      const { error } = await supa.from("simulado_resultados").upsert(linhas.slice(i, i + 200), { onConflict: "matricula_id" });
      if (error) return NextResponse.json({ error: "Não deu para gravar as notas. Tente de novo." }, { status: 500 });
    }

    // ── Plataforma: a nota no perfil de quem tem conta ───────────────────────
    const paraEscrever = (chaveMudou ? linhas : linhas.filter((l) => noLote.has(l.matricula_id))).filter((l) => l.perfil_id);
    const soltas = trocaram.map((i) => anterior.get(i.matricula_id)!.perfil_id!);
    let naPlataforma = 0;
    try {
      const examId = await garantirProva(supa, chave);
      await tirarDaPlataforma(supa, examId, [...new Set([...soltas, ...paraEscrever.map((l) => l.perfil_id!)])]);
      for (let i = 0; i < paraEscrever.length; i += 200) {
        const { error } = await supa.from("exam_attempts").insert(paraEscrever.slice(i, i + 200).map((l) => ({
          user_id: l.perfil_id!, exam_id: examId, score: l.acertos, total_questions: l.total,
          answers: respostasParaAProva(l.respostas), source: "teacher", completed_at: l.lancado_em,
        })));
        if (error) throw new Error(error.message);
      }
      naPlataforma = itens.filter((i) => i.perfil_id).length;

      // Sininho só para quem recebe a nota na conta pela primeira vez.
      const novos = linhas.filter((l) => noLote.has(l.matricula_id) && l.perfil_id && anterior.get(l.matricula_id)?.perfil_id !== l.perfil_id);
      for (let i = 0; i < novos.length; i += 200) {
        try {
          await supa.from("notifications").insert(novos.slice(i, i + 200).map((l) => ({ user_id: l.perfil_id!, type: "info", ...avisoDaNota(l.acertos, l.total) })));
        } catch { /* o aviso não pode derrubar o lançamento */ }
      }
    } catch {
      avisos.push("As notas foram gravadas e já aparecem no link, mas não deu para colocar na plataforma agora. Toque em lançar de novo.");
    }

    return NextResponse.json({ ok: true, gravados: itens.length, naPlataforma, soNoLink: itens.length - naPlataforma, avisos });
  }

  // ── Apagar uma nota lançada por engano ────────────────────────────────────
  if (corpo.acao === "apagar") {
    if (!ehUuid(corpo.matricula_id)) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const atual = await supa.from("simulado_resultados").select("perfil_id").eq("matricula_id", corpo.matricula_id).maybeSingle();
    if (semTabela(atual.error)) return NextResponse.json({ error: FALTA_MIGRATION }, { status: 503 });
    if (atual.error) return NextResponse.json({ error: "Não deu para apagar agora." }, { status: 500 });
    if (!atual.data) return NextResponse.json({ error: "Esta nota já não estava lançada." }, { status: 404 });
    // Primeiro a plataforma, depois a linha: se a primeira falhar, a nota continua
    // lançada inteira e dá para tentar de novo (o contrário deixaria a nota órfã no perfil).
    const perfil = atual.data.perfil_id as string | null;
    if (perfil) {
      try {
        const examId = await idDaProva(supa);
        if (examId) await tirarDaPlataforma(supa, examId, [perfil]);
      } catch {
        return NextResponse.json({ error: "Não deu para tirar a nota da plataforma. Tente de novo." }, { status: 500 });
      }
    }
    // Com `.select()`: sem linha apagada o Supabase não dá erro, e a tela diria "apagada" com a nota lá.
    const { data, error } = await supa.from("simulado_resultados").delete().eq("matricula_id", corpo.matricula_id).select("matricula_id");
    if (error || !data?.length) return NextResponse.json({ error: "Não deu para apagar agora." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
}
