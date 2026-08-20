/**
 * Agregação de nota de redação — o único lugar que sabe fazer média aqui.
 *
 * Existiam três médias divergentes espalhadas: `home/page.tsx` e
 * `StudentDashboard.tsx` excluíam zeros, `api/student/weekly-summary` os
 * incluía, e o boletim tinha a sua. Consertar a mistura de escalas em cada uma
 * delas multiplicaria a divergência por quatro em vez de acabar com ela.
 *
 * O motivo de existir é a escala: desde que a FUVEST entrou,
 * `essay_submissions.score` não tem mais um teto único. Um 45 pode ser 90% da
 * FUVEST ou 4,5% do ENEM, e somar os dois não produz número em escala nenhuma.
 *
 * REGRA: toda leitura de `essay_submissions` que use `score` precisa trazer
 * `banca` no `select` e passar por aqui.
 */
import { BANCAS, getBanca, type Banca, type BancaId } from '@/lib/bancas';

/** Uma redação corrigida, no recorte mínimo que as agregações precisam. */
export type RedacaoTreino = {
  score: number | null;
  created_at: string;
  theme?: string | null;
  /** Ausente nas linhas anteriores à migration da banca — valem como ENEM. */
  banca?: string | null;
};

export type MediaRedacao = {
  /** Média das tentativas que valem — `null` quando não há nenhuma. */
  media: number | null;
  /** Tentativas consideradas na média. */
  consideradas: number;
  /** Tentativas anuladas, contadas ao lado mas fora da média. */
  anuladas: number;
  melhor: number | null;
  ultima: number | null;
};

/**
 * Média das redações de treino.
 *
 * Anuladas (nota 0) ficam FORA da média e são contadas à parte. Uma anulação
 * mede falha de procedimento — fuga ao tema, cópia, texto insuficiente — não
 * capacidade de escrita; incluí-la afundaria a média justamente de quem treina
 * mais, que é o comportamento que a plataforma quer incentivar. O número de
 * anuladas continua visível para a informação não sumir.
 *
 * ⚠️ Espera receber redações de UMA banca só. Misturar escalas aqui devolve um
 * número sem significado — use `agruparPorBanca` antes.
 */
export function mediaRedacao(redacoes: RedacaoTreino[]): MediaRedacao {
  const notas = redacoes
    .map((r) => (typeof r.score === 'number' ? r.score : null))
    .filter((n): n is number => n !== null);

  const validas = notas.filter((n) => n > 0);
  const anuladas = notas.length - validas.length;

  if (!validas.length) {
    return { media: null, consideradas: 0, anuladas, melhor: null, ultima: null };
  }

  return {
    media: Math.round((validas.reduce((s, n) => s + n, 0) / validas.length) * 10) / 10,
    consideradas: validas.length,
    anuladas,
    melhor: Math.max(...validas),
    // `redacoes` chega em ordem decrescente de data, como o histórico consulta.
    ultima: notas[0] ?? null,
  };
}

/**
 * Agrupa por banca. Linha sem `banca` conta como ENEM — é o que ela é: todo o
 * histórico anterior à migration foi corrigido pelo ENEM.
 */
export function agruparPorBanca(redacoes: RedacaoTreino[]): Map<BancaId, RedacaoTreino[]> {
  const grupos = new Map<BancaId, RedacaoTreino[]>();
  for (const r of redacoes) {
    const id = getBanca(r.banca).id;
    const atual = grupos.get(id);
    if (atual) atual.push(r);
    else grupos.set(id, [r]);
  }
  return grupos;
}

export type ResumoDaBanca = { banca: Banca; resumo: MediaRedacao };

/**
 * Resumo da banca que o aluno está treinando agora — a da redação mais recente.
 *
 * É o número para um tile de dashboard, onde só cabe um. Escolher pela redação
 * mais recente e não pela banca mais frequente é deliberado: quem acabou de
 * migrar para a FUVEST veria a média do ENEM por semanas, justamente enquanto
 * treina a outra prova.
 *
 * Devolve `null` quando não há nenhuma redação corrigida.
 */
export function resumoDaBancaAtiva(redacoes: RedacaoTreino[]): ResumoDaBanca | null {
  if (!redacoes.length) return null;

  const maisRecente = redacoes.reduce((a, b) =>
    new Date(b.created_at).getTime() > new Date(a.created_at).getTime() ? b : a,
  );
  const banca = getBanca(maisRecente.banca);
  const daBanca = redacoes.filter((r) => getBanca(r.banca).id === banca.id);

  return { banca, resumo: mediaRedacao(daBanca) };
}

/** Resumo de cada banca que o aluno tem redação, para telas que mostram todas. */
export function resumoPorBanca(redacoes: RedacaoTreino[]): ResumoDaBanca[] {
  return [...agruparPorBanca(redacoes).entries()].map(([id, lista]) => ({
    banca: BANCAS[id],
    resumo: mediaRedacao(lista),
  }));
}
