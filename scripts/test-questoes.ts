/**
 * Testes da régua de integridade de questão.
 * `npx tsx scripts/test-questoes.ts`
 *
 * O que está sob teste é a fronteira entre "questão difícil" e "questão sem
 * pergunta". Ela decide o que o aluno vê no simulado e o que o script de
 * auditoria manda para a quarentena, então errar para o lado errado tem preço
 * nos dois sentidos: bloquear demais esvazia o banco, bloquear de menos deixa
 * o aluno chutando.
 *
 * Por isso metade dos casos aqui são NEGATIVOS — questões boas que se parecem
 * com as quebradas. São elas que impedem a régua de crescer sozinha.
 */
import {
  diagnosticarQuestao,
  questaoUtilizavel,
  motivoDeBloqueio,
  alternativasNormalizadas,
  apenasQuestoesUtilizaveis,
  enunciadoVisivel,
} from '../src/lib/questao-integridade';

let falhas = 0;
const eq = (nome: string, obtido: any, esperado: any) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${nome}${ok ? '' : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
};

const cinco = [
  { key: 'a', text: 'R$ 166,00.' },
  { key: 'b', text: 'R$ 156,00.' },
  { key: 'c', text: 'R$ 84,00.' },
  { key: 'd', text: 'R$ 46,00.' },
  { key: 'e', text: 'R$ 36,00.' },
];
const codigos = (q: any) => diagnosticarQuestao(q).map((d) => d.codigo);
const bloqueios = (q: any) => diagnosticarQuestao(q).filter((d) => d.bloqueia).map((d) => d.codigo);

// ─── 1. O caso que originou o módulo ────────────────────────────────────────
// Print de 02/09: questão 4 de 10, Matemática, sem nada acima do enunciado.
const doPrint = {
  question_text: 'A quantia que essa pessoa levava semanalmente para fazer a compra era',
  supporting_text: null,
  image_url: null,
  options: cinco,
  correct_answer: 'b',
};
eq('print: enunciado órfão é detectado', codigos(doPrint), ['enunciado_orfao']);
eq('print: não vai para a tela', questaoUtilizavel(doPrint), false);
eq('print: tem motivo legível',
  motivoDeBloqueio(doPrint),
  'O enunciado se refere a um apoio (texto, tabela ou figura) que não foi importado.');

// A MESMA questão com o texto de apoio de volta é boa — é o alvo do conserto.
eq('print: com o apoio recuperado, passa',
  questaoUtilizavel({
    ...doPrint,
    supporting_text: 'Uma pessoa faz compras semanais em um supermercado. Na última semana levou 2 kg de arroz a R$ 18,00 o quilo...',
  }),
  true);

// ─── 2. Enunciado órfão em outras formas ────────────────────────────────────
eq('"de acordo com o texto" sem apoio',
  bloqueios({ question_text: 'De acordo com o texto, a principal crítica do autor é', options: cinco, correct_answer: 'a' }),
  ['enunciado_orfao']);
eq('"observe o gráfico" sem imagem nem apoio',
  bloqueios({ question_text: 'Observe o gráfico e responda qual foi o mês de maior venda no período.', options: cinco, correct_answer: 'a' }),
  ['enunciado_orfao']);
eq('"na tabela acima" sem nada',
  bloqueios({ question_text: 'Na tabela acima, o produto mais caro custa', options: cinco, correct_answer: 'c' }),
  ['enunciado_orfao']);

// ─── 3. Negativos: questões boas que a régua NÃO pode derrubar ──────────────
eq('questão autossuficiente de matemática',
  codigos({
    question_text: 'Um reservatório com capacidade de 5.000 litros está com 40% de sua capacidade ocupada. Quantos litros faltam para enchê-lo?',
    options: cinco, correct_answer: 'a',
  }),
  []);
eq('dêitico COM antecedente no próprio enunciado',
  questaoUtilizavel({
    question_text: 'Uma pessoa comprou 3 kg de arroz por R$ 54,00. Essa pessoa pagou, por quilo, o valor de',
    options: cinco, correct_answer: 'b',
  }),
  true);
eq('"abaixo" com o dado logo depois dos dois-pontos',
  questaoUtilizavel({
    question_text: 'Observe a sequência numérica abaixo: 2, 4, 8, 16, 32. O próximo termo é',
    options: cinco, correct_answer: 'a',
  }),
  true);
eq('formato ENEM de completar (termina em verbo) é legítimo',
  codigos({
    question_text: 'A soma dos ângulos internos de um triângulo qualquer é',
    options: cinco, correct_answer: 'd',
  }),
  []);
eq('cita texto E tem o texto de apoio',
  codigos({
    question_text: 'Com base no texto, o narrador demonstra',
    supporting_text: 'Era uma vez, numa cidade pequena do interior, um homem que colecionava relógios parados...',
    options: cinco, correct_answer: 'a',
  }),
  []);
// Expressões fixas: a palavra de apoio faz parte do conteúdo da matéria e não
// aponta para material nenhum. É meia prova de Química, Biologia e Gramática.
eq('"tabela periódica" não é tabela que faltou',
  codigos({ question_text: 'Na tabela periódica, os elementos do grupo 1 são classificados como', options: cinco, correct_answer: 'a' }),
  []);
eq('"figura de linguagem" não é figura que faltou',
  codigos({ question_text: 'A figura de linguagem presente em "seus olhos são duas estrelas" chama-se', options: cinco, correct_answer: 'a' }),
  []);
eq('"texto constitucional" não é texto de apoio',
  codigos({ question_text: 'Segundo o texto constitucional brasileiro, a educação é direito de', options: cinco, correct_answer: 'a' }),
  []);
eq('"mapa mental" não é mapa que faltou',
  codigos({ question_text: 'O mapa mental é uma técnica de estudo que se caracteriza por', options: cinco, correct_answer: 'a' }),
  []);
eq('"plantas" de Biologia não é planta baixa',
  codigos({ question_text: 'Sobre o processo de fotossíntese nas plantas, conclui-se que', options: cinco, correct_answer: 'a' }),
  []);

eq('cita figura E tem a imagem',
  codigos({
    question_text: 'A figura representa uma circunferência de raio 5 cm. A área é',
    image_url: 'https://exemplo.com/fig.png',
    options: cinco, correct_answer: 'b',
  }),
  []);

// ─── 4. Enunciado cortado na importação ─────────────────────────────────────
eq('começa em minúscula = corte',
  bloqueios({ question_text: 'e, portanto, o resultado final da operação descrita é', options: cinco, correct_answer: 'a' }),
  ['enunciado_truncado']);
// ─── 4b. Os fins que PARECEM cortados e são o formato-padrão da banca ───────
// Todos estes vieram do banco real: a primeira versão da régua acusou 235
// questões por "fim pendurado" ou "abertura por conjunção", e as 235 estavam
// inteiras. A frase é feita para fechar NA ALTERNATIVA. Se algum destes voltar
// a falhar, a régua de corte cresceu de novo e vai comer questão boa.
//
// Os que citam apoio ("fragmento", "trecho", "dessa recomendação") vêm com
// `supporting_text` porque no banco real vinham: aqui o que está sob teste é o
// FIM da frase, não a falta de apoio.
eq('termina em preposição ("foi de")',
  codigos({ question_text: 'O valor total pago pelo consumidor no mês de março foi de', options: cinco, correct_answer: 'a' }),
  []);
eq('termina em "que"',
  codigos({ question_text: 'Sobre o processo de fotossíntese nas plantas, conclui-se que', options: cinco, correct_answer: 'a' }),
  []);
eq('termina em "a"',
  codigos({ question_text: 'O resultado da operação descrita no problema é igual a', options: cinco, correct_answer: 'a' }),
  []);
eq('termina em vírgula ("respectivamente,")',
  codigos({ question_text: 'A altura, a largura e a profundidade do desenho impresso serão, respectivamente,', options: cinco, correct_answer: 'a' }),
  []);
eq('termina em "porque"',
  codigos({ question_text: 'O não atendimento dessa recomendação resulta em aumento do consumo de energia porque', supporting_text: 'Texto de apoio: a conta de luz da residência subiu 30% em março, segundo o relatório da concessionária divulgado na semana passada.', options: cinco, correct_answer: 'a' }),
  []);
eq('termina em "pois"',
  codigos({ question_text: 'A função da linguagem predominante no fragmento é a emotiva ou expressiva, pois', supporting_text: 'Texto de apoio: a conta de luz da residência subiu 30% em março, segundo o relatório da concessionária divulgado na semana passada.', options: cinco, correct_answer: 'a' }),
  []);
eq('termina em "e" ("relação entre X e")',
  codigos({ question_text: 'O trecho do sermão estabelece uma relação entre a Paixão de Cristo e', supporting_text: 'Texto de apoio: a conta de luz da residência subiu 30% em março, segundo o relatório da concessionária divulgado na semana passada.', options: cinco, correct_answer: 'a' }),
  []);
eq('abre com "Assim sendo"',
  codigos({ question_text: 'Assim sendo, o valor de N calculado na etapa anterior está mais próximo de', supporting_text: 'Texto de apoio: a conta de luz da residência subiu 30% em março, segundo o relatório da concessionária divulgado na semana passada.', options: cinco, correct_answer: 'a' }),
  []);
eq('abre com "Que" (interrogativa)',
  codigos({ question_text: 'Que tipo de intervenção do poder público no espaço rural reduz a marginalização produtiva?', options: cinco, correct_answer: 'a' }),
  []);
eq('abre com dígito não é corte',
  questaoUtilizavel({ question_text: '150 g de farinha equivalem a quantos quilogramas?', options: cinco, correct_answer: 'a' }),
  true);
eq('enunciado vazio',
  bloqueios({ question_text: '   ', options: cinco, correct_answer: 'a' }),
  ['enunciado_vazio']);

// ─── 4c. O teto de tamanho da régua de órfã ─────────────────────────────────
// Enunciado longo quase sempre trouxe o apoio consigo: a importação despejou o
// texto DENTRO do `question_text` em vez do campo próprio. Das 230 órfãs que a
// régua sem teto acusava no banco real, as 135 com mais de 300 caracteres
// estavam todas inteiras.
const longaComTextoDentro =
  'Leia o trecho da letra da música Química, de João Bosco e Vinícius de Moraes. ' +
  'Desde o primeiro dia que a gente se viu, impressionante a química que nos uniu, ' +
  'e o tempo foi tornando tão intenso o nosso amor. Faróis iluminavam o meu coração, ' +
  'feito faísca que virou uma explosão, e o tempo foi tornando tão intenso o nosso amor. ' +
  'A relação entre o eu lírico e a pessoa amada, no trecho, é construída por meio de';
eq('enunciado longo traz o apoio consigo — não é órfã',
  codigos({ question_text: longaComTextoDentro, options: cinco, correct_answer: 'a' }),
  []);
eq('o mesmo enunciado curto, sem o texto, É órfã',
  bloqueios({ question_text: 'A relação entre o eu lírico e a pessoa amada, no trecho, é construída por meio de', options: cinco, correct_answer: 'a' }),
  ['enunciado_orfao']);

// O dêitico solto é evidência mais fraca que nomear o apoio, então tem teto
// menor: em enunciado médio ele costuma apontar para dentro do próprio texto.
const deiticoComAntecedenteLonge =
  'Pedro mantém uma dieta de 3.000 kcal diárias e toda essa energia é consumida por ' +
  'seu organismo a cada dia. Assim, ao final de um mês de trinta dias, seu organismo ' +
  'pode ser considerado equivalente a um aparelho elétrico que, nesse mês, tenha consumido';
eq('dêitico em enunciado médio não basta',
  codigos({ question_text: deiticoComAntecedenteLonge, options: cinco, correct_answer: 'a' }),
  []);

// ─── 5. Imagem pendente ─────────────────────────────────────────────────────
// A tela apaga o marcador antes de exibir, então sem imagem o buraco fica mudo.
eq('marcador sem imagem bloqueia',
  bloqueios({
    question_text: 'Analise a estrutura molecular representada. [IMAGEM_PENDENTE] O composto é classificado como',
    options: cinco, correct_answer: 'a',
  }),
  ['imagem_pendente']);
eq('marcador COM imagem passa',
  questaoUtilizavel({
    question_text: 'Analise a estrutura molecular representada. [IMAGEM_PENDENTE] O composto é classificado como',
    image_url: 'https://exemplo.com/mol.png',
    options: cinco, correct_answer: 'a',
  }),
  true);
eq('o marcador não conta como texto do enunciado',
  enunciadoVisivel('[IMAGEM_PENDENTE]  Qual é o  valor de x?'),
  'Qual é o valor de x?');

// ─── 6. Alternativas ────────────────────────────────────────────────────────
eq('três alternativas é de menos',
  bloqueios({ question_text: 'Qual é a capital do estado de São Paulo?', options: cinco.slice(0, 3), correct_answer: 'a' }),
  ['alternativas_de_menos']);
eq('quatro alternativas basta',
  questaoUtilizavel({ question_text: 'Qual é a capital do estado de São Paulo?', options: cinco.slice(0, 4), correct_answer: 'a' }),
  true);
eq('alternativa vazia bloqueia',
  bloqueios({
    question_text: 'Qual é a capital do estado de São Paulo?',
    options: [...cinco.slice(0, 4), { key: 'e', text: '  ' }], correct_answer: 'a',
  }),
  ['alternativa_vazia']);
eq('alternativas repetidas bloqueiam',
  bloqueios({
    question_text: 'Qual é a capital do estado de São Paulo?',
    options: [...cinco.slice(0, 4), { key: 'e', text: 'R$ 166,00.' }], correct_answer: 'a',
  }),
  ['alternativas_repetidas']);
// Caixa importa: vieram do banco real, de uma questão de pelagem de labradores
// que a régua condenou por engano quando comparava em minúsculas.
eq('genótipos que só diferem na caixa NÃO são repetidos',
  codigos({
    question_text: 'Em cães labradores, dois genes condicionam as três pelagens típicas da raça. O genótipo do animal é',
    supporting_text: 'A pelagem dourada é condicionada pela presença do alelo e em homozigose, independentemente do gene B.',
    options: [
      { key: 'a', text: 'Ee BB.' }, { key: 'b', text: 'Ee Bb.' }, { key: 'c', text: 'ee bb.' },
      { key: 'd', text: 'ee BB.' }, { key: 'e', text: 'ee Bb.' },
    ],
    correct_answer: 'c',
  }),
  []);

eq('options nulo bloqueia',
  bloqueios({ question_text: 'Qual é a capital do estado de São Paulo?', options: null, correct_answer: 'a' }),
  ['alternativas_de_menos']);

// Os três formatos históricos de `options` que as telas já aceitam.
eq('formato {letter,text}',
  alternativasNormalizadas([{ letter: 'A', text: 'um' }, { letter: 'B', text: 'dois' }]),
  [{ key: 'a', text: 'um' }, { key: 'b', text: 'dois' }]);
eq('formato lista de strings',
  alternativasNormalizadas(['um', 'dois']),
  [{ key: 'a', text: 'um' }, { key: 'b', text: 'dois' }]);
eq('lista de strings com 5 itens é questão válida',
  questaoUtilizavel({
    question_text: 'Qual é a capital do estado de São Paulo?',
    options: ['São Paulo', 'Campinas', 'Santos', 'Sorocaba', 'Osasco'],
    correct_answer: 'a',
  }),
  true);

// ─── 7. Gabarito ────────────────────────────────────────────────────────────
eq('gabarito fora das alternativas bloqueia',
  bloqueios({ question_text: 'Qual é a capital do estado de São Paulo?', options: cinco, correct_answer: 'f' }),
  ['gabarito_fora_das_alternativas']);
eq('gabarito em maiúscula casa',
  questaoUtilizavel({ question_text: 'Qual é a capital do estado de São Paulo?', options: cinco, correct_answer: 'B' }),
  true);
eq('gabarito gravado como o texto da alternativa casa',
  questaoUtilizavel({ question_text: 'Qual é a capital do estado de São Paulo?', options: cinco, correct_answer: 'R$ 84,00.' }),
  true);
// Nulo é legítimo: a prova antiga corrige por `exams.answer_key`.
eq('gabarito nulo avisa, não bloqueia',
  codigos({ question_text: 'Qual é a capital do estado de São Paulo?', options: cinco, correct_answer: null }),
  ['gabarito_ausente']);
eq('gabarito nulo continua utilizável',
  questaoUtilizavel({ question_text: 'Qual é a capital do estado de São Paulo?', options: cinco, correct_answer: null }),
  true);

// ─── 8. Aviso sem bloqueio ──────────────────────────────────────────────────
// Fala de gráfico, não tem imagem, mas tem texto de apoio: pode ser a tabela
// reproduzida em texto. Entra no relatório do professor, não sai da tela.
const graficoSemImagem = {
  question_text: 'Segundo o gráfico, o crescimento no período foi de',
  supporting_text: 'Ano | Vendas\n2020 | 100\n2021 | 150\n2022 | 210',
  options: cinco, correct_answer: 'a',
};
eq('gráfico sem imagem mas com apoio: avisa', codigos(graficoSemImagem), ['apoio_visual_ausente']);
eq('gráfico sem imagem mas com apoio: continua na tela', questaoUtilizavel(graficoSemImagem), true);

// ─── 9. Filtro de lista ─────────────────────────────────────────────────────
const lote = [
  doPrint,
  { question_text: 'Quanto é 2 + 2 no sistema decimal?', options: cinco, correct_answer: 'a' },
  { question_text: 'De acordo com a tirinha, o humor decorre de', options: cinco, correct_answer: 'b' },
];
const { utilizaveis, descartadas } = apenasQuestoesUtilizaveis(lote);
eq('filtro devolve só a sã', utilizaveis.length, 1);
eq('filtro conta as descartadas', descartadas, 2);

console.log(falhas === 0 ? '\n✅ todos os testes passaram' : `\n❌ ${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
