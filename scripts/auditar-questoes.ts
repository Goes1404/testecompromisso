/**
 * Auditoria do banco de questões — acha, conserta e põe em quarentena o que o
 * aluno não consegue responder.
 *
 * Uso:
 *   npx tsx scripts/auditar-questoes.ts                 # só relatório (não escreve nada)
 *   npx tsx scripts/auditar-questoes.ts --csv           # relatório + questoes-com-defeito.csv
 *   npx tsx scripts/auditar-questoes.ts --consertar     # devolve o texto de apoio herdado da prova
 *   npx tsx scripts/auditar-questoes.ts --desativar     # ativa=false no que sobrou quebrado
 *   npx tsx scripts/auditar-questoes.ts --consertar --desativar   # a ordem correta
 *   npx tsx scripts/auditar-questoes.ts --reativar      # devolve à ativa o que já foi consertado à mão
 *   npx tsx scripts/auditar-questoes.ts --amostras 8    # quantos exemplos por defeito no relatório
 *
 * Requer no .env.local: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 *
 * O padrão é NÃO ESCREVER. A régua é heurística sobre texto em português
 * (src/lib/questao-integridade.ts) e quem decide sobre o conteúdo do cursinho
 * é o professor: rode primeiro sem bandeira, leia as amostras, e só então
 * aplique. É o mesmo motivo pelo qual `--desativar` nunca apaga — ver o
 * cabeçalho da migration 20260902000000.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  diagnosticarQuestao,
  motivoDeBloqueio,
  enunciadoVisivel,
  type CodigoDefeito,
  type DefeitoDeQuestao,
} from '../src/lib/questao-integridade';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ─── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const CONSERTAR = args.includes('--consertar');
const DESATIVAR = args.includes('--desativar');
const REATIVAR = args.includes('--reativar');
const CSV = args.includes('--csv');
const AMOSTRAS = (() => {
  const i = args.indexOf('--amostras');
  const n = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 4;
})();
const ESCREVE = CONSERTAR || DESATIVAR || REATIVAR;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error('❌ Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local.');
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });

// ─── Tipos locais ────────────────────────────────────────────────────────────
interface Questao {
  id: string;
  question_text: string | null;
  supporting_text: string | null;
  image_url: string | null;
  options: unknown;
  correct_answer: string | null;
  subject_id: string | null;
  exam_board: string | null;
  target_audience: string | null;
  ativa?: boolean | null;
  motivo_inativa?: string | null;
}

/** Posição da questão dentro da prova — é ela que dá as vizinhas. */
interface Posicao {
  exam_id: string;
  order_index: number;
}

const PAGINA = 1000;

// ─── Leitura ─────────────────────────────────────────────────────────────────

/**
 * Descobre se a migration de quarentena já foi aplicada.
 *
 * Sem esta sonda, o script inteiro morreria com um 400 do PostgREST em quem
 * ainda não rodou `npx supabase db push` — e o relatório, que não depende de
 * coluna nenhuma, é justamente a parte que essa pessoa precisa ver primeiro.
 */
async function temColunaAtiva(): Promise<boolean> {
  const { error } = await supabase.from('questions').select('ativa').limit(1);
  return !error;
}

async function lerQuestoes(comAtiva: boolean): Promise<Questao[]> {
  const colunas =
    'id, question_text, supporting_text, image_url, options, correct_answer, subject_id, exam_board, target_audience' +
    (comAtiva ? ', ativa, motivo_inativa' : '');
  const todas: Questao[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from('questions')
      .select(colunas)
      .order('id')
      .range(de, de + PAGINA - 1);
    if (error) throw new Error(`lendo questions: ${error.message}`);
    const lote = (data ?? []) as unknown as Questao[];
    todas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return todas;
}

/** question_id → posição na prova. Uma questão pode estar em mais de uma prova;
 *  fica a primeira, que basta para achar vizinhas. */
async function lerPosicoes(): Promise<Map<string, Posicao>> {
  const mapa = new Map<string, Posicao>();
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from('exam_questions')
      .select('exam_id, question_id, order_index')
      .order('exam_id')
      .range(de, de + PAGINA - 1);
    if (error) throw new Error(`lendo exam_questions: ${error.message}`);
    const lote = (data ?? []) as { exam_id: string; question_id: string; order_index: number }[];
    for (const linha of lote) {
      if (!mapa.has(linha.question_id)) {
        mapa.set(linha.question_id, { exam_id: linha.exam_id, order_index: linha.order_index });
      }
    }
    if (lote.length < PAGINA) break;
  }
  return mapa;
}

async function nomeDasProvas(ids: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from('exams')
      .select('id, title, year, exam_type')
      .in('id', ids.slice(i, i + 200));
    for (const e of (data ?? []) as any[]) {
      mapa.set(e.id, e.title || `${(e.exam_type ?? '?').toUpperCase()} ${e.year ?? ''}`.trim());
    }
  }
  return mapa;
}

// ─── Conserto ────────────────────────────────────────────────────────────────

const vazio = (s: unknown) => typeof s !== 'string' || s.trim().length === 0;

/**
 * Herda o texto de apoio da questão vizinha da mesma prova.
 *
 * É o conserto que resolve a maioria dos casos, e ele existe porque o defeito
 * tem origem conhecida: o enunciado original diz "utilize o texto para
 * responder às questões 12 a 15" e a IA de extração devolve o texto só na 12.
 * As irmãs ficam órfãs — mas o apoio delas está ali do lado, na mesma prova,
 * a uma ou duas posições de distância.
 *
 * Só olha vizinha IMEDIATA (±2). Um texto de apoio de três questões antes
 * pertence a outro bloco, e enfiar o texto errado na questão é pior do que
 * deixá-la quebrada: vira questão que parece inteira e mede a coisa errada.
 */
const DISTANCIA_MAXIMA = 2;

function apoioHerdado(
  alvo: Questao,
  posicao: Posicao | undefined,
  porProva: Map<string, { ordem: number; q: Questao }[]>,
): { texto: string; deQuem: string; distancia: number } | null {
  if (!posicao) return null;
  const irmas = porProva.get(posicao.exam_id);
  if (!irmas) return null;

  let melhor: { texto: string; deQuem: string; distancia: number } | null = null;
  for (const irma of irmas) {
    if (irma.q.id === alvo.id) continue;
    if (vazio(irma.q.supporting_text)) continue;
    const distancia = Math.abs(irma.ordem - posicao.order_index);
    if (distancia === 0 || distancia > DISTANCIA_MAXIMA) continue;
    if (!melhor || distancia < melhor.distancia) {
      melhor = { texto: irma.q.supporting_text as string, deQuem: irma.q.id, distancia };
    }
  }
  return melhor;
}

// ─── Relatório ───────────────────────────────────────────────────────────────

const ROTULOS: Record<CodigoDefeito, string> = {
  enunciado_vazio: 'Sem enunciado',
  enunciado_truncado: 'Enunciado cortado na importação',
  enunciado_orfao: 'Enunciado órfão (cita apoio que não veio)',
  imagem_pendente: 'Marcada com [IMAGEM_PENDENTE] e sem imagem',
  apoio_visual_ausente: 'Cita figura/gráfico e não tem imagem (conferir)',
  alternativas_de_menos: 'Alternativas de menos',
  alternativa_vazia: 'Alternativa em branco',
  alternativas_repetidas: 'Alternativas idênticas',
  gabarito_ausente: 'Sem gabarito próprio (corrige pela prova)',
  gabarito_fora_das_alternativas: 'Gabarito não bate com nenhuma alternativa',
};

const recorte = (s: string | null | undefined, n = 110) => {
  const t = enunciadoVisivel(s ?? '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const comAtiva = await temColunaAtiva();
  if (!comAtiva) {
    console.log(
      '⚠  A coluna `questions.ativa` não existe neste banco.\n' +
      '   O relatório roda igual, mas --consertar/--desativar/--reativar precisam dela.\n' +
      '   Aplique a migration: npx supabase db push\n',
    );
    if (DESATIVAR || REATIVAR) process.exit(1);
  }

  console.log('Lendo o banco de questões…');
  const [questoes, posicoes] = await Promise.all([lerQuestoes(comAtiva), lerPosicoes()]);
  console.log(`  ${questoes.length} questões · ${posicoes.size} com posição em prova\n`);

  // Índice prova → questões ordenadas, para achar vizinha na hora do conserto.
  const porProva = new Map<string, { ordem: number; q: Questao }[]>();
  const porId = new Map(questoes.map((q) => [q.id, q]));
  for (const [questionId, pos] of posicoes) {
    const q = porId.get(questionId);
    if (!q) continue;
    const lista = porProva.get(pos.exam_id) ?? [];
    lista.push({ ordem: pos.order_index, q });
    porProva.set(pos.exam_id, lista);
  }

  // ── 1. Conserto ──
  let consertadas = 0;
  const semConserto: Questao[] = [];
  if (CONSERTAR) {
    console.log('── Conserto: devolvendo o texto de apoio herdado da prova ──');
    for (const q of questoes) {
      const defeitos = diagnosticarQuestao(q);
      if (!defeitos.some((d) => d.codigo === 'enunciado_orfao')) continue;

      const herdado = apoioHerdado(q, posicoes.get(q.id), porProva);
      if (!herdado) {
        semConserto.push(q);
        continue;
      }
      // Só aplica se o apoio herdado realmente resolve. Um texto que não
      // conserta a questão é um texto que não era dela.
      const depois = diagnosticarQuestao({ ...q, supporting_text: herdado.texto });
      if (depois.some((d) => d.codigo === 'enunciado_orfao')) {
        semConserto.push(q);
        continue;
      }
      // `auditada_em` só entra se a coluna existir: o conserto em si (devolver o
      // texto de apoio) não depende da migration, e é ele que tira a questão do
      // buraco. Bloquear o conserto por causa do carimbo seria trocar o que
      // importa pelo que registra.
      const alteracao: Record<string, unknown> = { supporting_text: herdado.texto };
      if (comAtiva) alteracao.auditada_em = new Date().toISOString();
      const { error } = await supabase.from('questions').update(alteracao).eq('id', q.id);
      if (error) {
        console.log(`  ✗ ${q.id}: ${error.message}`);
        semConserto.push(q);
        continue;
      }
      q.supporting_text = herdado.texto; // reflete em memória para o relatório abaixo
      consertadas++;
      if (consertadas <= 10) {
        console.log(`  ✔ ${recorte(q.question_text, 70)}  ← apoio da vizinha (±${herdado.distancia})`);
      }
    }
    console.log(`  ${consertadas} consertadas · ${semConserto.length} órfãs sem vizinha com apoio\n`);
  }

  // ── 2. Diagnóstico final ──
  const comDefeito: { q: Questao; defeitos: DefeitoDeQuestao[] }[] = [];
  const contagem = new Map<CodigoDefeito, number>();
  const bloqueiaPorCodigo = new Map<CodigoDefeito, boolean>();
  let bloqueadas = 0;
  for (const q of questoes) {
    const defeitos = diagnosticarQuestao(q);
    if (defeitos.length === 0) continue;
    comDefeito.push({ q, defeitos });
    if (defeitos.some((d) => d.bloqueia)) bloqueadas++;
    for (const d of defeitos) {
      contagem.set(d.codigo, (contagem.get(d.codigo) ?? 0) + 1);
      bloqueiaPorCodigo.set(d.codigo, d.bloqueia);
    }
  }

  const sas = questoes.length - bloqueadas;
  console.log('── Diagnóstico ──');
  console.log(`  ${questoes.length} questões no banco`);
  console.log(`  ${sas} respondíveis (${((sas / Math.max(1, questoes.length)) * 100).toFixed(1)}%)`);
  console.log(`  ${bloqueadas} o aluno NÃO consegue responder\n`);

  const ordenados = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
  for (const [codigo, n] of ordenados) {
    const bloqueia = bloqueiaPorCodigo.get(codigo);
    console.log(`${bloqueia ? '🚫' : '⚠️ '} ${String(n).padStart(5)}  ${ROTULOS[codigo]}`);
    const amostras = comDefeito
      .filter((c) => c.defeitos.some((d) => d.codigo === codigo))
      .slice(0, AMOSTRAS);
    for (const a of amostras) console.log(`          · ${recorte(a.q.question_text)}`);
    if (n > AMOSTRAS) console.log(`          … e mais ${n - AMOSTRAS}`);
    console.log('');
  }

  // ── 3. Onde dói mais: as provas com mais questão quebrada ──
  const nomes = await nomeDasProvas([...porProva.keys()]);
  const porProvaQuebradas = new Map<string, { total: number; quebradas: number }>();
  for (const [examId, lista] of porProva) {
    let quebradas = 0;
    for (const { q } of lista) if (diagnosticarQuestao(q).some((d) => d.bloqueia)) quebradas++;
    if (quebradas > 0) porProvaQuebradas.set(examId, { total: lista.length, quebradas });
  }
  if (porProvaQuebradas.size > 0) {
    console.log('── Provas mais atingidas ──');
    [...porProvaQuebradas.entries()]
      .sort((a, b) => b[1].quebradas - a[1].quebradas)
      .slice(0, 12)
      .forEach(([id, c]) =>
        console.log(`  ${String(c.quebradas).padStart(3)}/${String(c.total).padEnd(3)}  ${nomes.get(id) ?? id}`),
      );
    console.log('');
  }

  // ── 4. CSV ──
  if (CSV) {
    const escapa = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [
      ['id', 'bloqueia', 'defeitos', 'enunciado', 'tem_apoio', 'tem_imagem', 'banca', 'publico'].join(','),
      ...comDefeito.map(({ q, defeitos }) =>
        [
          q.id,
          defeitos.some((d) => d.bloqueia) ? 'sim' : 'nao',
          defeitos.map((d) => d.codigo).join(' '),
          enunciadoVisivel(q.question_text),
          vazio(q.supporting_text) ? 'nao' : 'sim',
          vazio(q.image_url) ? 'nao' : 'sim',
          q.exam_board ?? '',
          q.target_audience ?? '',
        ].map(escapa).join(','),
      ),
    ];
    const arquivo = path.resolve(process.cwd(), 'questoes-com-defeito.csv');
    fs.writeFileSync(arquivo, `﻿${linhas.join('\n')}`, 'utf8');
    console.log(`📄 ${arquivo} (${comDefeito.length} linhas)\n`);
  }

  // ── 5. Quarentena ──
  if (DESATIVAR && comAtiva) {
    const paraDesativar = comDefeito.filter(
      ({ q, defeitos }) => defeitos.some((d) => d.bloqueia) && q.ativa !== false,
    );
    console.log(`── Quarentena: desativando ${paraDesativar.length} questões ──`);
    let feitas = 0;
    for (const { q } of paraDesativar) {
      const { error } = await supabase
        .from('questions')
        .update({
          ativa: false,
          motivo_inativa: motivoDeBloqueio(q),
          auditada_em: new Date().toISOString(),
        })
        .eq('id', q.id);
      if (error) console.log(`  ✗ ${q.id}: ${error.message}`);
      else feitas++;
    }
    console.log(`  ${feitas} desativadas (nenhuma apagada — o histórico do aluno continua de pé)\n`);
  }

  // ── 6. Volta do conserto manual ──
  if (REATIVAR && comAtiva) {
    const paraReativar = questoes.filter(
      (q) => q.ativa === false && !diagnosticarQuestao(q).some((d) => d.bloqueia),
    );
    console.log(`── Reativando ${paraReativar.length} questões já consertadas ──`);
    let feitas = 0;
    for (const q of paraReativar) {
      const { error } = await supabase
        .from('questions')
        .update({ ativa: true, motivo_inativa: null, auditada_em: new Date().toISOString() })
        .eq('id', q.id);
      if (error) console.log(`  ✗ ${q.id}: ${error.message}`);
      else feitas++;
    }
    console.log(`  ${feitas} reativadas\n`);
  }

  if (!ESCREVE) {
    console.log('Nada foi escrito no banco (modo relatório).');
    console.log('Confira as amostras acima e depois: --consertar --desativar');
  }
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e);
  process.exit(1);
});
