/**
 * Testes da banca FUVEST e da parametrização do motor por banca.
 * `npx tsx scripts/test-banca-fuvest.ts`
 *
 * O que este arquivo protege, além da FUVEST em si: que o ENEM continue sendo
 * o default em todo caminho que não pede banca. `test-inep-banca.ts` cobre o
 * protocolo no ENEM chamando tudo SEM banca — se o default mudasse, ele
 * quebraria. Aqui a checagem é explícita.
 */
import {
  BANCAS, BANCA_ENEM, BANCA_FUVEST, getBanca, isBancaId, bancaSugeridaPara,
} from '../src/lib/bancas';
import {
  aplicarProtocoloInep, motivosDeDiscrepancia, snapCompetency, total,
} from '../src/lib/inep-banca';
import { analisarRedacao, evidenciaParaPrompt } from '../src/lib/essay-analysis';
import { PROPOSTA_FUVEST_NOSTALGIA, motivadoresDaProposta } from '../src/lib/propostas/fuvest-nostalgia';
import {
  mediaRedacao, agruparPorBanca, resumoDaBancaAtiva, resumoPorBanca,
  type RedacaoTreino,
} from '../src/lib/redacao-metrics';

let falhas = 0;
let testes = 0;

function checar(nome: string, condicao: boolean, detalhe = '') {
  testes++;
  if (condicao) console.log(`  ✓ ${nome}`);
  else { falhas++; console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`); }
}

const v = (...n: number[]) => ({ vetor: n });

console.log('\nConfiguração da banca');
{
  checar('FUVEST tem 3 eixos', BANCA_FUVEST.criterios.length === 3);
  checar('ENEM tem 5 competências', BANCA_ENEM.criterios.length === 5);
  checar('FUVEST não exige intervenção', BANCA_FUVEST.exigeIntervencao === false);
  checar('ENEM exige intervenção', BANCA_ENEM.exigeIntervencao === true);
  checar('teto da FUVEST é 50', BANCA_FUVEST.totalMax === 50);
  checar('teto do ENEM é 1000', BANCA_ENEM.totalMax === 1000);
  checar('grade da FUVEST vai de 0 a 50 em degraus de 10',
    JSON.stringify(BANCA_FUVEST.valoresValidos) === JSON.stringify([0, 10, 20, 30, 40, 50]));
  checar('as duas bancas têm 6 bandas',
    BANCA_FUVEST.valoresValidos.length === BANCA_ENEM.valoresValidos.length);
  checar('todo valor válido da FUVEST cabe no teto do critério',
    BANCA_FUVEST.valoresValidos.every(x => x <= BANCA_FUVEST.criterios[0].max));
  checar('critérios de conteúdo da FUVEST são DT e ES',
    JSON.stringify(BANCA_FUVEST.criteriosDeConteudo) === JSON.stringify(['dt', 'es']));
  checar('critério de norma da FUVEST é EX', BANCA_FUVEST.criterioNorma === 'ex');
  checar('prompt da FUVEST proíbe cobrar intervenção',
    BANCA_FUVEST.systemPrompt.includes('PROIBIÇÃO DE COBRAR INTERVENÇÃO'));
  // A FUVEST cita "0 a 1000" de propósito, na frase que contrasta com o ENEM.
  // O que não pode existir é a INSTRUÇÃO de somar até 1000.
  checar('prompt da FUVEST manda tirar média até 50',
    BANCA_FUVEST.systemPrompt.includes('MÉDIA aritmética dos três eixos') &&
    BANCA_FUVEST.systemPrompt.includes('varia de 0 a 50'));
  checar('prompt da FUVEST não manda somar as competências',
    !BANCA_FUVEST.systemPrompt.includes('soma exata de c1'));
  checar('prompt da FUVEST diz explicitamente que não é a soma',
    BANCA_FUVEST.systemPrompt.includes('NÃO é a soma'));
  checar('prompt do ENEM segue falando em 0 a 1000',
    BANCA_ENEM.systemPrompt.includes('varia de 0 a 1000'));
}

console.log('\nResolução da banca');
{
  checar('id conhecido resolve', getBanca('fuvest').id === 'fuvest');
  checar('id desconhecido cai no ENEM', getBanca('unicamp').id === 'enem');
  checar('nulo cai no ENEM', getBanca(null).id === 'enem');
  checar('indefinido cai no ENEM', getBanca(undefined).id === 'enem');
  checar('string vazia cai no ENEM', getBanca('').id === 'enem');
  checar('isBancaId rejeita lixo', !isBancaId('' as any) && !isBancaId(42 as any));
  checar('sugere FUVEST para quem mira USP', bancaSugeridaPara('ENEM / USP') === 'fuvest');
  checar('sugere FUVEST para quem escreve fuvest', bancaSugeridaPara('Fuvest') === 'fuvest');
  checar('sugere ENEM para o resto', bancaSugeridaPara('ENEM') === 'enem');
  checar('sugere ENEM sem objetivo definido', bancaSugeridaPara(null) === 'enem');
  checar('ETEC não vira FUVEST', bancaSugeridaPara('ETEC') === 'enem');
}

console.log('\nCombinação da nota');
{
  checar('ENEM soma os cinco', total([200, 200, 200, 200, 200], BANCA_ENEM) === 1000);
  checar('FUVEST tira a média dos três', total([50, 50, 50], BANCA_FUVEST) === 50);
  checar('FUVEST média de 50/40/30 é 40', total([50, 40, 30], BANCA_FUVEST) === 40);
  checar('FUVEST arredonda a média', total([50, 40, 40], BANCA_FUVEST) === 43,
    String(total([50, 40, 40], BANCA_FUVEST)));
  checar('FUVEST nunca passa do teto',
    BANCA_FUVEST.valoresValidos.every(() => total([50, 50, 50], BANCA_FUVEST) <= 50));
  checar('sem banca, total ainda soma como ENEM', total([200, 200, 200, 200, 200]) === 1000);
}

console.log('\nsnapCompetency por banca');
{
  checar('FUVEST: 33 vira 30', snapCompetency(33, BANCA_FUVEST) === 30, String(snapCompetency(33, BANCA_FUVEST)));
  checar('FUVEST: 999 satura em 50', snapCompetency(999, BANCA_FUVEST) === 50);
  checar('FUVEST: negativo vira 0', snapCompetency(-5, BANCA_FUVEST) === 0);
  checar('FUVEST: lixo vira 0', snapCompetency('abc', BANCA_FUVEST) === 0);
  checar('FUVEST nunca devolve valor fora da grade',
    [0, 7, 13, 26, 41, 50, 77].every(n =>
      BANCA_FUVEST.valoresValidos.includes(snapCompetency(n, BANCA_FUVEST))));
  checar('sem banca, 150 ainda vira 160 (ENEM)', snapCompetency(150) === 160);
}

console.log('\nDiscrepância na escala da FUVEST');
{
  checar('notas iguais não discrepam',
    motivosDeDiscrepancia([40, 40, 40], [40, 40, 40], BANCA_FUVEST).length === 0);
  checar('diferença pequena não discrepa',
    motivosDeDiscrepancia([40, 40, 40], [40, 30, 40], BANCA_FUVEST).length === 0,
    JSON.stringify(motivosDeDiscrepancia([40, 40, 40], [40, 30, 40], BANCA_FUVEST)));
  checar('eixo muito distante discrepa',
    motivosDeDiscrepancia([50, 50, 50], [50, 50, 20], BANCA_FUVEST).length > 0);
  checar('motivo cita o eixo pelo nome',
    motivosDeDiscrepancia([50, 0, 0], [10, 0, 0], BANCA_FUVEST).some(m => m.includes('DT')),
    JSON.stringify(motivosDeDiscrepancia([50, 0, 0], [10, 0, 0], BANCA_FUVEST)));
  // A proporção do limiar POR CRITÉRIO é comparável entre as bancas: os dois
  // são fração do máximo de um critério. A do TOTAL não é — no ENEM o total é
  // soma de 5 critérios e na FUVEST é média de 3, então a mesma divergência
  // por eixo produz efeitos de escala diferentes no total.
  checar('limiar por critério é proporcional ao do ENEM',
    BANCA_FUVEST.discrepanciaCriterio / 50 === BANCA_ENEM.discrepanciaCriterio / 200);

  // Um eixo divergindo 10 não é discrepância; dois eixos, sim.
  checar('divergência num eixo só não discrepa',
    motivosDeDiscrepancia([40, 40, 30], [40, 30, 30], BANCA_FUVEST).length === 0,
    JSON.stringify(motivosDeDiscrepancia([40, 40, 30], [40, 30, 30], BANCA_FUVEST)));
  checar('divergência em dois eixos discrepa',
    motivosDeDiscrepancia([40, 40, 40], [40, 30, 30], BANCA_FUVEST).length > 0,
    JSON.stringify(motivosDeDiscrepancia([40, 40, 40], [40, 30, 30], BANCA_FUVEST)));
}

console.log('\nProtocolo aplicado à FUVEST');
{
  const r = aplicarProtocoloInep([v(40, 40, 30), v(40, 30, 30)], BANCA_FUVEST);
  checar('sem discrepância, usa as duas', r.usadas.length === 2 && !r.houveDiscrepancia);
  checar('média por eixo, não arredondada para a grade', r.vetor[1] === 35, `vetor=${r.vetor}`);
  checar('total é a média dos eixos', r.total === total(r.vetor, BANCA_FUVEST));
  checar('nota final cabe na escala', r.total >= 0 && r.total <= BANCA_FUVEST.totalMax, `total=${r.total}`);

  const disc = aplicarProtocoloInep([v(50, 50, 50), v(10, 10, 10), v(50, 50, 40)], BANCA_FUVEST);
  checar('com discrepância, descarta o destoante', !disc.usadas.includes(1), `usadas=${disc.usadas}`);
  checar('ainda dentro da escala', disc.total <= BANCA_FUVEST.totalMax);

  const uma = aplicarProtocoloInep([v(30, 30, 30)], BANCA_FUVEST);
  checar('uma correção só devolve ela mesma', uma.total === 30, `total=${uma.total}`);
}

console.log('\nEvidência determinística por banca');
{
  const texto = `A nostalgia atravessa o presente e o reinventa. Portanto, o governo deveria criar campanhas por meio das escolas para conscientizar a populacao, a fim de reduzir o problema.

Ademais, a memoria nao devolve o passado: ela o constroi. Assim, e preciso refletir criticamente sobre o que uma sociedade escolhe guardar.`.repeat(4);

  const evEnem = evidenciaParaPrompt(analisarRedacao(texto, [], BANCA_ENEM), BANCA_ENEM);
  const evFuvest = evidenciaParaPrompt(analisarRedacao(texto, [], BANCA_FUVEST), BANCA_FUVEST);

  checar('ENEM recebe o bloco de intervenção', evEnem.includes('Proposta de intervenção'));
  checar('FUVEST NÃO recebe o bloco de intervenção', !evFuvest.includes('Proposta de intervenção'));
  checar('FUVEST não recebe o aviso da heurística de C5', !evFuvest.includes('fechar C5'));
  checar('FUVEST mantém a contagem de conectivos', evFuvest.includes('Conectivos'));
  checar('FUVEST mantém a extensão', evFuvest.includes('Extensão'));
  checar('sem banca, o bloco de intervenção aparece (ENEM)',
    evidenciaParaPrompt(analisarRedacao(texto)).includes('Proposta de intervenção'));

  // Cópia contamina os critérios de conteúdo — que não são os mesmos índices.
  const motivador = 'A memoria aparece como forca subjetiva ao mesmo tempo profunda e ativa, latente e penetrante, oculta e invasora, e ela atravessa todo o presente de quem lembra.';
  const copiado = (motivador + ' ').repeat(6);
  const evCopiaF = evidenciaParaPrompt(analisarRedacao(copiado, [motivador], BANCA_FUVEST), BANCA_FUVEST);
  const evCopiaE = evidenciaParaPrompt(analisarRedacao(copiado, [motivador], BANCA_ENEM), BANCA_ENEM);
  checar('FUVEST manda avaliar DT e ES na cópia', evCopiaF.includes('DT e ES'), evCopiaF.slice(-160));
  checar('ENEM manda avaliar C2 e C3 na cópia', evCopiaE.includes('C2 e C3'), evCopiaE.slice(-160));
}

console.log('\nContagem de linhas e texto insuficiente');
{
  const curto = 'A nostalgia e um tema importante para pensar o presente das pessoas hoje.';
  checar('texto curto é insuficiente na FUVEST',
    analisarRedacao(curto, [], BANCA_FUVEST).textoInsuficiente);
  checar('texto curto é insuficiente no ENEM',
    analisarRedacao(curto, [], BANCA_ENEM).textoInsuficiente);
  const longo = curto.repeat(20);
  checar('texto longo não é insuficiente em nenhuma banca',
    !analisarRedacao(longo, [], BANCA_FUVEST).textoInsuficiente &&
    !analisarRedacao(longo, [], BANCA_ENEM).textoInsuficiente);
}


console.log('\nAgregação com bancas misturadas');
{
  const r = (score: number | null, dia: string, banca?: string | null): RedacaoTreino =>
    ({ score, created_at: `2026-08-${dia}T12:00:00Z`, banca });

  // Três de ENEM e uma de FUVEST — o caso que produzia "611 pts" na home.
  const misturado = [
    r(45, '18', 'fuvest'),
    r(780, '15', 'enem'),
    r(820, '12', 'enem'),
    r(800, '10', 'enem'),
  ];

  const grupos = agruparPorBanca(misturado);
  checar('separa as duas bancas', grupos.size === 2, `size=${grupos.size}`);
  checar('3 redações no ENEM', (grupos.get('enem') ?? []).length === 3);
  checar('1 redação na FUVEST', (grupos.get('fuvest') ?? []).length === 1);

  const ativa = resumoDaBancaAtiva(misturado)!;
  checar('banca ativa é a da redação MAIS RECENTE, não a mais frequente',
    ativa.banca.id === 'fuvest', `id=${ativa.banca.id}`);
  checar('média da banca ativa é só da FUVEST', ativa.resumo.media === 45, String(ativa.resumo.media));
  checar('média nunca cai entre as duas escalas',
    ativa.resumo.media !== null && ativa.resumo.media <= ativa.banca.totalMax,
    `media=${ativa.resumo.media} teto=${ativa.banca.totalMax}`);
  // O número que o bug produzia: (780+820+800+45)/4 = 611.
  checar('não reproduz o 611 da média cruzada', ativa.resumo.media !== 611);

  // Mesma lista, agora com a mais recente sendo de ENEM.
  const enemRecente = [r(800, '20', 'enem'), r(45, '18', 'fuvest'), r(780, '15', 'enem')];
  const ativa2 = resumoDaBancaAtiva(enemRecente)!;
  checar('troca de banca ativa quando a mais recente muda', ativa2.banca.id === 'enem');
  checar('média do ENEM ignora a nota da FUVEST', ativa2.resumo.media === 790, String(ativa2.resumo.media));

  // Linhas antigas, anteriores à migration, não têm banca.
  const semBanca = [r(700, '14', null), r(800, '13'), r(900, '12', undefined as any)];
  const grupoLegado = agruparPorBanca(semBanca);
  checar('linha sem banca conta como ENEM',
    grupoLegado.size === 1 && (grupoLegado.get('enem') ?? []).length === 3);
  checar('banca desconhecida também cai no ENEM',
    agruparPorBanca([r(700, '14', 'unicamp')]).get('enem')?.length === 1);

  // Cada banca com seu resumo.
  const todos = resumoPorBanca(misturado);
  checar('resumoPorBanca devolve uma entrada por banca', todos.length === 2);
  checar('cada resumo respeita o próprio teto',
    todos.every(t => t.resumo.media === null || t.resumo.media <= t.banca.totalMax),
    JSON.stringify(todos.map(t => [t.banca.id, t.resumo.media])));
}

console.log('\nAnuladas e casos de borda da média');
{
  const r = (score: number | null, dia: string, banca = 'enem'): RedacaoTreino =>
    ({ score, created_at: `2026-08-${dia}T12:00:00Z`, banca });

  const comAnuladas = mediaRedacao([r(800, '15'), r(0, '14'), r(600, '13'), r(0, '12')]);
  checar('anuladas ficam fora da média', comAnuladas.media === 700, String(comAnuladas.media));
  checar('anuladas são contadas ao lado', comAnuladas.anuladas === 2);
  checar('consideradas conta só as válidas', comAnuladas.consideradas === 2);
  checar('melhor ignora as anuladas', comAnuladas.melhor === 800);
  checar('ultima é a primeira da lista (ordem decrescente)', comAnuladas.ultima === 800);

  const soAnuladas = mediaRedacao([r(0, '15'), r(0, '14')]);
  checar('só anuladas devolve media null', soAnuladas.media === null);
  checar('só anuladas não divide por zero', Number.isNaN(soAnuladas.media as any) === false);
  checar('só anuladas ainda conta as anuladas', soAnuladas.anuladas === 2);

  const vazia = mediaRedacao([]);
  checar('lista vazia devolve media null', vazia.media === null);
  checar('lista vazia não lança', vazia.consideradas === 0 && vazia.anuladas === 0);
  checar('resumoDaBancaAtiva de lista vazia devolve null', resumoDaBancaAtiva([]) === null);

  const comNulos = mediaRedacao([r(null, '15'), r(600, '14')]);
  checar('score null é ignorado, não vira zero', comNulos.media === 600 && comNulos.anuladas === 0);
}

console.log('\nProposta padrão da FUVEST');
{
  const p = PROPOSTA_FUVEST_NOSTALGIA;
  checar('tem os 5 textos motivadores', p.textos.length === 5, `n=${p.textos.length}`);
  checar('nenhum motivador está vazio', p.textos.every(t => t.texto.trim().length > 40));
  checar('toda fonte tem crédito', p.textos.every(t => t.fonte.trim().length > 3));
  checar('o tema é a pergunta da proposta',
    p.tema === 'Nostalgia: o passado que permanece ou o presente que se perde?');
  checar('o comando repete o tema', p.comando.includes(p.tema));
  checar('o comando pede tese filosófica', p.comando.includes('tese filosófica'));
  checar('o comando NÃO pede intervenção', !/interven|solu[çc]/i.test(p.comando));
  checar('o gênero é dissertação', p.genero === 'dissertação');
  checar('motivadoresDaProposta devolve texto puro',
    motivadoresDaProposta(p).length === 5 && motivadoresDaProposta(p).every(t => typeof t === 'string'));
  checar('os motivadores passam pelo filtro de tamanho da rota (>4 chars)',
    motivadoresDaProposta(p).every(t => t.trim().length > 4));
  checar('Ecléa Bosi está entre as fontes', p.textos.some(t => t.fonte.includes('Bosi')));
  checar('Drummond está entre as fontes', p.textos.some(t => t.fonte.includes('Drummond')));
}

console.log(`\n${testes - falhas}/${testes} testes passaram.`);
if (falhas > 0) { console.error(`${falhas} FALHA(S).`); process.exit(1); }
