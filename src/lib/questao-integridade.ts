/**
 * Integridade de questão — decide se uma questão é RESPONDÍVEL pelo aluno.
 *
 * O defeito que motivou este módulo: questões que chegam ao simulado com o
 * enunciado órfão. O aluno lê "A quantia que essa pessoa levava semanalmente
 * para fazer a compra era" e cinco valores em reais — sem a tabela de compras,
 * sem o texto de apoio, sem imagem. Não é questão difícil: é questão sem
 * pergunta. O aluno chuta, erra, e o erro entra no desempenho dele como se
 * fosse conhecimento faltando.
 *
 * A causa está na importação: `structureQuestions` (ETEC) e a extração do ENEM
 * pedem à IA que repita o `supporting_text` em CADA questão do bloco
 * ("utilize o texto para responder as questões 12 a 15"). Quando o modelo
 * economiza e devolve o texto só na primeira, as irmãs ficam penduradas. O
 * import filtrava `depends_on_image` e contagem de alternativas — nunca se a
 * pergunta ainda fazia sentido sozinha.
 *
 * Este módulo é a rede que faltava, e vale nos dois lados:
 *   - na tela, `questaoUtilizavel()` tira a questão quebrada do sorteio;
 *   - no banco, `scripts/auditar-questoes.ts` usa o mesmo diagnóstico para
 *     consertar (herdando o texto da questão vizinha da mesma prova) ou
 *     quarentenar o que sobrou.
 *
 * As duas pontas usam ESTA função de propósito: um filtro de tela que não bate
 * com o relatório do banco faria o professor procurar por uma questão que o
 * aluno vê e ele não encontra.
 *
 * ── Sobre a régua ───────────────────────────────────────────────────────────
 * É heurística sobre texto em português, então erra nas bordas. A escolha
 * consciente foi por FALSO NEGATIVO: quando a evidência é ambígua, o defeito
 * é `bloqueia: false` (entra no relatório, não some da tela). Questão ruim que
 * passa custa uma; questão boa apagada em massa custa o banco inteiro — e o
 * script de auditoria nunca apaga, só desativa, justamente para isso.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type CodigoDefeito =
  | 'enunciado_vazio'
  | 'enunciado_truncado'
  | 'enunciado_orfao'
  | 'imagem_pendente'
  | 'apoio_visual_ausente'
  | 'alternativas_de_menos'
  | 'alternativa_vazia'
  | 'alternativas_repetidas'
  | 'gabarito_ausente'
  | 'gabarito_fora_das_alternativas';

export interface DefeitoDeQuestao {
  codigo: CodigoDefeito;
  /** `true` = a questão não pode ser respondida; tem de sair da tela do aluno. */
  bloqueia: boolean;
  /** Frase pronta para o relatório do professor. */
  detalhe: string;
}

export interface QuestaoParaValidar {
  id?: string;
  question_text?: string | null;
  supporting_text?: string | null;
  image_url?: string | null;
  options?: unknown;
  correct_answer?: string | null;
}

export interface Alternativa {
  key: string;
  text: string;
}

/** Marcador que a extração deixa onde havia figura (ver CLAUDE.md, IA Extraction). */
export const MARCA_IMAGEM = '[IMAGEM_PENDENTE]';

/**
 * Mínimo de alternativas. Quatro e não cinco: a ETEC tem cinco, mas há questão
 * de professor cadastrada com quatro, e ela é respondível.
 */
export const MINIMO_DE_ALTERNATIVAS = 4;

// ─── Normalização ────────────────────────────────────────────────────────────

const vazio = (s: unknown): boolean =>
  typeof s !== 'string' || s.replace(/\s+/g, ' ').trim().length === 0;

/** Texto sem o marcador de imagem e com espaços colapsados — como o aluno lê. */
export function enunciadoVisivel(texto?: string | null): string {
  if (typeof texto !== 'string') return '';
  return texto.split(MARCA_IMAGEM).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * `options` chega em três formatos históricos: `[{key,text}]` (import novo),
 * `[{letter,text}]` (import ENEM antigo) e `["texto", ...]` (cadastro manual
 * de professor). As telas já lidam com os três via `o.key || o.letter || índice`;
 * aqui a mesma regra vira uma função só, para o diagnóstico enxergar o que a
 * tela enxerga.
 */
export function alternativasNormalizadas(options: unknown): Alternativa[] {
  if (!Array.isArray(options)) return [];
  return options.map((o, i) => {
    const letraPorPosicao = String.fromCharCode(65 + i).toLowerCase();
    if (typeof o === 'string') return { key: letraPorPosicao, text: o };
    if (o && typeof o === 'object') {
      const registro = o as Record<string, unknown>;
      const key = registro.key ?? registro.letter ?? letraPorPosicao;
      const text = registro.text ?? registro.texto ?? '';
      return {
        key: String(key ?? letraPorPosicao).trim().toLowerCase(),
        text: typeof text === 'string' ? text : String(text ?? ''),
      };
    }
    return { key: letraPorPosicao, text: '' };
  });
}

// ─── Régua do enunciado órfão ────────────────────────────────────────────────

/**
 * Palavras que apontam para algo fora do enunciado.
 *
 * Duas famílias, e a diferença importa:
 *   - `APOIO_TEXTUAL` pede `supporting_text` ("de acordo com o texto");
 *   - `APOIO_VISUAL` pede `image_url` ("observe o gráfico").
 *
 * `tabela` e `quadro` estão nas duas porque a extração às vezes reproduz a
 * tabela em texto dentro do `supporting_text` — e aí a questão está inteira.
 */
const APOIO_TEXTUAL =
  /\b(?:t(?:e|é)xt[oa]s?|trechos?|fragmentos?|excertos?|passagens?|poemas?|sonetos?|cr(?:ô|o)nicas?|reportagens?|not(?:í|i)cias?|manchetes?|di(?:á|a)logos?|entrevistas?|cita(?:ç|c)(?:ã|a)o|enunciado|tabelas?)\b/iu;

const APOIO_VISUAL =
  /\b(?:figuras?|imagens?|fotografias?|gr(?:á|a)ficos?|mapas?|charges?|tirinhas?|quadrinhos?|esquemas?|ilustra(?:ç|c)(?:õ|o)es|ilustra(?:ç|c)(?:ã|a)o|diagramas?|infogr(?:á|a)ficos?|cartazes?|cartaz)\b/iu;

/**
 * Expressões fixas em que a palavra de apoio NÃO aponta para lugar nenhum.
 *
 * "tabela periódica" é conteúdo de Química, não uma tabela que faltou;
 * "figura de linguagem" é conteúdo de Português. Sem esta lista, meia prova de
 * ciências e de gramática viraria falso positivo — foi exatamente o que o
 * teste "termina em 'que' é formato ENEM" pegou, com um enunciado sobre
 * fotossíntese "nas plantas".
 *
 * A lista é curta de propósito: só entra aqui expressão consagrada, nunca
 * ajuste para calar um caso isolado.
 */
const EXPRESSOES_FIXAS =
  /\b(?:tabela\s+peri(?:ó|o)dica|figuras?\s+de\s+linguagem|t(?:e|é)xtos?\s+(?:constitucional|legal|b(?:í|i)blico|liter(?:á|a)rio|argumentativo|dissertativo|narrativo|cient(?:í|i)fico)|mapas?\s+mental|mapas?\s+mentais|imagem\s+corporal|gr(?:á|a)fico\s+de\s+fun(?:ç|c)(?:ã|a)o)\b/giu;

/** Tira as expressões fixas antes de procurar referência a apoio. */
function semExpressoesFixas(texto: string): string {
  return texto.replace(EXPRESSOES_FIXAS, ' ');
}

/**
 * Demonstrativo/dêitico: aponta para um antecedente. "essa pessoa", "o valor
 * acima", "a figura ao lado". É o que denuncia o caso do print, onde nenhuma
 * palavra de apoio aparece — só um "essa pessoa" sem pessoa nenhuma antes.
 */
const DEITICO =
  /\b(?:ess[ea]s?|est[ea]s?|aquel[ea]s?|ness[ea]s?|nest[ea]s?|naquel[ea]s?|dess[ea]s?|dest[ea]s?|daquel[ea]s?|referid[oa]s?|mencionad[oa]s?|citad[oa]s?|apresentad[oa]s?|acima|abaixo|ao lado|a seguir|anterior(?:es)?|supracitad[oa]s?)\b/iu;

/**
 * Primeira oração do enunciado.
 *
 * A régua do dêitico só vale aqui: "Uma pessoa comprou 3 kg de arroz. Essa
 * pessoa gastou…" tem o antecedente dentro do próprio enunciado e está
 * perfeita. Um dêitico logo na abertura, ao contrário, não tem a que se ligar
 * — o antecedente ficou no apoio que não veio.
 */
function primeiraOracao(texto: string): string {
  const corte = texto.search(/[.!?;]\s/u);
  return corte === -1 ? texto : texto.slice(0, corte);
}

/**
 * O enunciado traz o próprio dado?
 *
 * "Observe a sequência abaixo: 2, 4, 8, 16." tem dêitico na primeira oração e
 * mesmo assim está completa — o "abaixo" aponta para o que vem depois dos dois
 * pontos, no mesmo campo. Sem esta saída, toda questão desse formato viraria
 * falso positivo.
 */
function trazODadoConsigo(texto: string): boolean {
  const doisPontos = texto.indexOf(':');
  return doisPontos !== -1 && texto.slice(doisPontos + 1).trim().length >= 10;
}

/**
 * Enunciado que começa no meio da frase.
 *
 * Sintoma de corte na extração: o pedaço de cima ficou para trás. Enunciado de
 * prova sempre abre com maiúscula, então a inicial minúscula é prova de que
 * falta coisa antes.
 *
 * ── O que esta régua NÃO olha, e por quê ────────────────────────────────────
 * A primeira versão também marcava abertura por conjunção (que, assim, logo,
 * pois) e fim pendurado (vírgula, "porque", "pois", "e"). Rodada contra as
 * 3.986 questões reais do banco, ela acusou 235 questões — e as 235 estavam
 * inteiras:
 *
 *   "Assim sendo, o valor de N está mais próximo de"
 *   "Que princípio marcante do Futurismo … está destacado no texto?"
 *   "A altura, a largura e a profundidade … serão, respectivamente,"
 *   "…resulta em aumento do consumo de energia porque"
 *   "…é a emotiva ou expressiva, pois"
 *
 * São o formato-padrão da banca: a frase é feita para fechar NA ALTERNATIVA.
 * "porque", "pois", "respectivamente," e "entre X e" são justamente onde a
 * alternativa entra. A parte que sobrou (inicial minúscula) não acusou nenhuma
 * questão do banco atual — e é assim que se quer: ela existe para o dia em que
 * uma extração cortar o enunciado de verdade, sem custar uma questão boa hoje.
 */
function comecaNoMeioDaFrase(texto: string): boolean {
  const primeiro = texto.trimStart();
  if (primeiro.length === 0) return false;
  const inicial = primeiro[0];
  // Dígito, aspas, parêntese e travessão abrem enunciado legítimo ("2 kg de…").
  if (!/\p{L}/u.test(inicial)) return false;
  return inicial === inicial.toLowerCase() && inicial !== inicial.toUpperCase();
}

/**
 * Até que tamanho um enunciado sem apoio é suspeito.
 *
 * A pergunta que a régua faz é "o apoio veio junto?". Num enunciado longo a
 * resposta é quase sempre sim: a importação despejou o texto de apoio DENTRO
 * do `question_text` em vez de gravá-lo no campo próprio, e a questão está
 * inteira — só mal arrumada.
 *
 * Medido no banco: das 230 questões que a régua sem teto acusava, as 135 com
 * mais de 300 caracteres traziam o texto consigo, todas. Eram falso positivo.
 *
 *   "Leia o trecho da letra da música Química, de João Bosco… Desde o primeiro
 *    dia que a gente se viu / Impressionante a química que nos uniu…"
 *
 * O teto do dêitico é menor porque a evidência é mais fraca: "essa situação"
 * pode estar apontando para dentro do próprio enunciado, e quanto mais longo
 * ele for, mais provável que esteja.
 */
const TETO_ORFA_COM_PALAVRA_DE_APOIO = 300;
const TETO_ORFA_SO_COM_DEITICO = 150;

// ─── Diagnóstico ─────────────────────────────────────────────────────────────

/**
 * Lista tudo de errado com a questão. Lista vazia = questão sã.
 *
 * A ordem é a da leitura do professor: primeiro o enunciado, depois o apoio,
 * depois as alternativas, por fim o gabarito.
 */
export function diagnosticarQuestao(q: QuestaoParaValidar): DefeitoDeQuestao[] {
  const defeitos: DefeitoDeQuestao[] = [];
  const enunciado = enunciadoVisivel(q.question_text);
  const temApoioTextual = !vazio(q.supporting_text);
  const temImagem = !vazio(q.image_url);

  // ── Enunciado ──
  if (enunciado.length < 15) {
    defeitos.push({
      codigo: 'enunciado_vazio',
      bloqueia: true,
      detalhe: enunciado.length === 0
        ? 'A questão não tem enunciado.'
        : `Enunciado com ${enunciado.length} caracteres — curto demais para ser uma pergunta.`,
    });
    // Sem enunciado, o resto do diagnóstico de texto não diz nada de novo.
  } else {
    if (comecaNoMeioDaFrase(enunciado)) {
      defeitos.push({
        codigo: 'enunciado_truncado',
        bloqueia: true,
        detalhe: 'O enunciado começa no meio da frase — foi cortado na importação.',
      });
    }

    // ── Apoio prometido e não entregue ──
    const semFixas = semExpressoesFixas(enunciado);
    const abertura = primeiraOracao(semFixas);
    const pedeApoioTextual = APOIO_TEXTUAL.test(semFixas);
    const pedeApoioVisual = APOIO_VISUAL.test(semFixas);
    const nomeiaOApoio = pedeApoioTextual || pedeApoioVisual;

    // Duas forças de evidência, dois tetos. Nomear o apoio ("segundo o texto",
    // "observe a figura") é forte; um dêitico solto ("essa situação") é fraco e
    // só vale em enunciado curto, onde não há espaço para o antecedente estar
    // dentro dele.
    const apontaParaFora =
      (nomeiaOApoio && enunciado.length <= TETO_ORFA_COM_PALAVRA_DE_APOIO) ||
      (DEITICO.test(abertura) && enunciado.length <= TETO_ORFA_SO_COM_DEITICO);

    if (apontaParaFora && !temApoioTextual && !temImagem && !trazODadoConsigo(enunciado)) {
      // O caso do print: a pergunta aponta para alguma coisa e não há coisa
      // nenhuma na tela. Não dá para responder nem sabendo a matéria.
      defeitos.push({
        codigo: 'enunciado_orfao',
        bloqueia: true,
        detalhe: 'O enunciado se refere a um apoio (texto, tabela ou figura) que não foi importado.',
      });
    } else if (pedeApoioVisual && !temImagem && !trazODadoConsigo(enunciado)) {
      // Tem texto de apoio, mas a questão fala de gráfico/figura. Às vezes a
      // tabela está reproduzida em texto e está tudo certo — por isso avisa,
      // não bloqueia: quem decide é o professor, olhando.
      defeitos.push({
        codigo: 'apoio_visual_ausente',
        bloqueia: false,
        detalhe: 'O enunciado cita figura/gráfico, mas a questão não tem imagem. Conferir se o texto de apoio já traz o dado.',
      });
    }
  }

  // O marcador significa "aqui havia uma figura". A tela o apaga antes de
  // exibir, então sem `image_url` o aluno recebe a questão com o buraco
  // silencioso — pior do que com o marcador à mostra.
  if (typeof q.question_text === 'string' && q.question_text.includes(MARCA_IMAGEM) && !temImagem) {
    defeitos.push({
      codigo: 'imagem_pendente',
      bloqueia: true,
      detalhe: `Enunciado marcado com ${MARCA_IMAGEM} e sem imagem anexada.`,
    });
  }

  // ── Alternativas ──
  const alternativas = alternativasNormalizadas(q.options);
  if (alternativas.length < MINIMO_DE_ALTERNATIVAS) {
    defeitos.push({
      codigo: 'alternativas_de_menos',
      bloqueia: true,
      detalhe: `A questão tem ${alternativas.length} alternativa(s); o mínimo é ${MINIMO_DE_ALTERNATIVAS}.`,
    });
  } else {
    if (alternativas.some((a) => vazio(a.text))) {
      defeitos.push({
        codigo: 'alternativa_vazia',
        bloqueia: true,
        detalhe: 'Há alternativa sem texto.',
      });
    }
    // Comparação sensível a MAIÚSCULA/minúscula, e é ela que importa: em
    // genética "Ee BB" e "ee bb" são genótipos diferentes, e em química "Co" é
    // cobalto enquanto "CO" é monóxido de carbono. A primeira versão baixava a
    // caixa antes de comparar e condenou uma questão de pelagem de labradores
    // cujas cinco alternativas eram todas distintas.
    const textos = alternativas.map((a) => a.text.replace(/\s+/g, ' ').trim());
    if (new Set(textos).size < textos.length) {
      defeitos.push({
        codigo: 'alternativas_repetidas',
        bloqueia: true,
        detalhe: 'Há alternativas idênticas — a questão tem mais de uma resposta certa ou perdeu uma opção.',
      });
    }
  }

  // ── Gabarito ──
  // Nulo é legítimo em prova antiga: o gabarito mora em `exams.answer_key`
  // (migration 20260520100000). Por isso não bloqueia — a prova corrige pela
  // chave dela, e o simulado já não sorteia questão sem resposta.
  if (vazio(q.correct_answer)) {
    defeitos.push({
      codigo: 'gabarito_ausente',
      bloqueia: false,
      detalhe: 'Sem `correct_answer` — só corrige dentro de uma prova com gabarito próprio.',
    });
  } else if (alternativas.length > 0) {
    const gabarito = String(q.correct_answer).trim().toLowerCase();
    const casaComChave = alternativas.some((a) => a.key === gabarito);
    const casaComTexto = alternativas.some(
      (a) => a.text.replace(/\s+/g, ' ').trim().toLowerCase() === gabarito,
    );
    if (!casaComChave && !casaComTexto) {
      defeitos.push({
        codigo: 'gabarito_fora_das_alternativas',
        bloqueia: true,
        detalhe: `O gabarito "${q.correct_answer}" não corresponde a nenhuma alternativa — acertar é impossível.`,
      });
    }
  }

  return defeitos;
}

/** A questão pode ir para a tela do aluno? */
export function questaoUtilizavel(q: QuestaoParaValidar): boolean {
  return !diagnosticarQuestao(q).some((d) => d.bloqueia);
}

/**
 * Motivo em uma linha, para gravar em `questions.motivo_inativa` e para o
 * professor ler na lista. `null` quando nada bloqueia.
 */
export function motivoDeBloqueio(q: QuestaoParaValidar): string | null {
  const bloqueios = diagnosticarQuestao(q).filter((d) => d.bloqueia);
  if (bloqueios.length === 0) return null;
  return bloqueios.map((d) => d.detalhe).join(' ');
}

/**
 * Filtro de tela. Devolve as questões sãs e quantas ficaram pelo caminho, para
 * quem chama poder dizer ao aluno por que vieram menos questões do que ele
 * pediu — em vez de entregar 7 de 10 sem explicação.
 */
export function apenasQuestoesUtilizaveis<T extends QuestaoParaValidar>(
  questoes: readonly T[],
): { utilizaveis: T[]; descartadas: number } {
  const utilizaveis = questoes.filter(questaoUtilizavel);
  return { utilizaveis, descartadas: questoes.length - utilizaveis.length };
}
