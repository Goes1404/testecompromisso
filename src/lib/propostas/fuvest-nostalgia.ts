/**
 * Proposta padrão do modo FUVEST.
 *
 * Escrita pelo Prof. Fernando Martins para os alunos do Compromisso de Santana
 * de Parnaíba, e transcrita do PDF original sem alteração de conteúdo.
 *
 * Vive em código, e não numa linha de `essay_weekly_themes`, por três razões:
 * não existe tela de administração de temas (hoje um tema semanal só entra por
 * SQL direto no banco); a tela do aluno já tem precedente de proposta embutida
 * como reserva; e os textos motivadores precisam ser exatos, porque é contra
 * eles que `detectarCopia` compara o que o aluno escreveu — um motivador com
 * palavra trocada faz a detecção de cópia errar em silêncio.
 *
 * Quando houver mais de uma proposta FUVEST, o caminho é `supporting_texts
 * JSONB` + `banca TEXT` em `essay_weekly_themes` e migrar esta constante.
 */

export type PropostaRedacao = {
  /** O recorte que o aluno deve discutir — vai para `essay_submissions.theme`. */
  tema: string;
  /** Gênero pedido no comando. */
  genero: string;
  /** Comando da proposta, como o professor escreveu. */
  comando: string;
  /** Autoria, para dar crédito na tela. */
  autoria: string;
  textos: ReadonlyArray<{ fonte: string; texto: string }>;
};

const BOSI = `Com a última afirmação, começa-se a atribuir à memória uma função decisiva no processo psicológico total: a memória permite a relação do corpo presente com o passado e, ao mesmo tempo, interfere no processo "atual" das representações. Pela memória, o passado não só vem à tona das águas presentes, misturando-se com as percepções imediatas, como também empurra, "desloca" estas últimas, ocupando o espaço todo da consciência. A memória aparece como força subjetiva ao mesmo tempo profunda e ativa, latente e penetrante, oculta e invasora.`;

const RESPOSTA_AO_TEMPO = `Batidas na porta da frente
É o tempo
Eu bebo um pouquinho
Pra ter argumento
Mas fico sem jeito calado e ele ri
Ele zomba do quanto eu chorei
Porque sabe passar e eu não sei

Num dia azul de verão
Sinto o vento
Há folhas no meu coração
É o tempo
Recordo um amor que perdi, ele ri
Diz que somos iguais, se eu notei
Pois não sabe ficar
E eu também não sei

E gira em volta de mim
Sussurra que apaga os caminhos
Que amores terminam no escuro
Sozinhos
Respondo que ele aprisiona
Eu liberto
Que ele adormece as paixões
Eu desperto

E o tempo se rói com inveja de mim
Me vigia querendo aprender
Como eu morro de amor
Pra tentar reviver
No fundo é uma eterna criança
Que não soube amadurecer
Eu posso, ele não vai poder
Me esquecer`;

const BENJAMIN = `"A verdadeira imagem do passado perpassa, veloz. O passado só se deixa fixar como imagem que relampeja irreversivelmente, no momento em que é reconhecido. [...] Articular historicamente o passado não significa conhecê-lo 'tal como ele propriamente foi'. Significa apoderar-se de uma reminiscência que relampeja em um momento de perigo."`;

const FURTO_DE_FLOR = `Furtei uma flor daquele jardim. O porteiro do edifício cochilava e eu furtei a flor. Trouxe-a para casa e coloquei-a no copo com água. Logo senti que ela não estava feliz. O copo destina-se a beber, e flor não é para ser bebida. Passei-a para o vaso, e notei que ela me agradecia, revelando melhor sua delicada composição. Quantas novidades há numa flor, se a contemplarmos bem.

Sendo autor do furto, eu assumira a obrigação de conservá-la. Renovei a água do vaso, mas a flor empalidecia. Temi por sua vida. Não adiantava restituí-la ao jardim. Nem apelar para o médico das flores. Eu a furtara, eu a via morrer. Já murcha, e com a cor particular da morte, peguei-a docemente e fui depositá-la no jardim onde desabrochara. O porteiro estava atento e repreendeu-me:

— Que ideia a sua, vir jogar lixo de sua casa neste jardim!`;

const EPITAFIO = `Devia ter amado mais
Ter chorado mais
Ter visto o Sol nascer
Devia ter arriscado mais
E até errado mais
Ter feito o que eu queria fazer

Queria ter aceitado
As pessoas como elas são
Cada um sabe a alegria
E a dor que traz no coração

O acaso vai me proteger
Enquanto eu andar distraído
O acaso vai me proteger
Enquanto eu andar

Devia ter complicado menos
Trabalhado menos
Ter visto o Sol se pôr
Devia ter me importado menos
Com problemas pequenos
Ter morrido de amor

Queria ter aceitado
A vida como ela é
A cada um cabe alegrias
E a tristeza que vier`;

export const PROPOSTA_FUVEST_NOSTALGIA: PropostaRedacao = {
  tema: 'Nostalgia: o passado que permanece ou o presente que se perde?',
  genero: 'dissertação',
  // Transcrito como o professor escreveu, inclusive "apresentas" — é o
  // documento oficial dele, não cabe ao código corrigir o enunciado.
  comando:
    'Com base nas ideias apresentas nos textos motivadores e em como o tema impacta na sociedade, ' +
    'redija uma dissertação na qual você exponha o seguinte tema: ' +
    '"Nostalgia: o passado que permanece ou o presente que se perde?". ' +
    'Lembrem-se de trabalhar a tese filosófica, mantendo a reflexão crítica; ' +
    'além disso pesquisem repertórios que possam se conectar ao tema.',
  autoria: 'Prof. Fernando Martins',
  textos: [
    { fonte: 'Ecléa Bosi, Memória e sociedade: lembranças de velhos', texto: BOSI },
    { fonte: 'Aldir Blanc, "Resposta ao tempo"', texto: RESPOSTA_AO_TEMPO },
    { fonte: 'Walter Benjamin, Sobre o conceito de história', texto: BENJAMIN },
    { fonte: 'Carlos Drummond de Andrade, "Furto de flor"', texto: FURTO_DE_FLOR },
    { fonte: 'Titãs, "Epitáfio"', texto: EPITAFIO },
  ],
};

/** Os motivadores em texto puro, no formato que o motor de correção espera. */
export function motivadoresDaProposta(proposta: PropostaRedacao): string[] {
  return proposta.textos.map((t) => t.texto);
}
