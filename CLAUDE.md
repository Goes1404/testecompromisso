# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Projeto: Cursinho Compromisso LMS

Plataforma de gestão educacional e aprendizado adaptativo para alunos do cursinho Compromisso (Santana de Parnaíba). Voltada ao ENEM e ETEC, com papéis: `admin`, `teacher`, `student`.

## 🛠 Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Validar build de produção
npm run typecheck    # tsc --noEmit (verificar tipos sem compilar)
npm run lint         # ESLint
npx supabase login   # Autenticar no CLI Supabase
npx supabase db push # Aplicar migrations locais ao projeto remoto
```

## 🚀 Stack

- **Framework**: Next.js 15 (App Router) — versão real é 15, não 14
- **Linguagem**: TypeScript (path alias `@/*` → `./src/*`)
- **Estilização**: Tailwind CSS + Shadcn/UI
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **IA (Aurora)**: OpenAI GPT-4o-mini via Vercel AI SDK (`ai`, `@ai-sdk/openai`)
- **Ícones**: Lucide React
- **Animações**: Framer Motion (já instalado)
- **Charts**: Recharts (usar `dynamic(..., { ssr: false })` para SSR)
- **Mascote 3D**: SVG em camadas + CSS transform (sem three.js — ver abaixo)

## 🐺 Mascote (bichinho) 3D

O bichinho tem **dois modos de desenho**, e quem escolhe é o `Mascote`:

- **Arte renderizada** (preferida): existe `/public/mascotes/<arquetipo>.webp`?
  É ela que aparece. Requisitos e prompts de geração em
  `public/mascotes/README.md` — **fundo transparente é obrigatório**, porque a
  arena desenha o próprio cenário e o boneco pula/inclina/roda por cima dele.
- **Rig 2.5D em SVG** (fallback): sem arquivo, o bicho é montado em dez camadas
  de SVG e gira 360° de verdade por paralaxe. Nada de `three` +
  `react-three-fiber` — custaria ~600 KB de JS e um `.glb` por arquétipo, numa
  plataforma que roda no celular do aluno em rede móvel.

O vetor entra primeiro e a foto substitui quando carrega. É de propósito: em
rede ruim, esperar a imagem deixaria a arena vazia por segundos, e vazia para
sempre se ela nunca chegar.

| Arquivo | Papel |
|---------|-------|
| `src/lib/mascote.ts` | Engine: arquétipos, CP/HP, iluminação, estado de animação, `specDoMascote` e `promptDeImagem` |
| `components/mascote/Mascote.tsx` | Decide entre foto e vetor |
| `components/mascote/useImagemDoMascote.ts` | Sonda se existe arte renderizada (cache de uma sondagem por sessão) |
| `components/mascote/MascoteRenderizado.tsx` | A foto: inclinação ±22° no arrasto, pirueta, carinho |
| `components/mascote/Mascote3D.tsx` | O rig em SVG: giro 360°, arrasto, carinho |
| `components/mascote/arte.tsx` | As peças em SVG (orelha, focinho, cauda…) e a profundidade de cada camada |
| `components/mascote/ArenaMascote.tsx` | A moldura estilo Pokémon GO (CP, HP, anel de captura) |
| `components/mascote/MascoteRetrato.tsx` | Versão parada — foto ou vetor, para grades e cartões |
| `components/mascote/controle.ts` | `MascoteControle`, a interface que as duas implementações expõem |

**Foto e vetor não são equivalentes**, e a diferença é deliberada: uma imagem é
uma face só, então `girar360` nela é uma pirueta (não há costas para mostrar) e
`expressao`/`nivel` não chegam a ela (não há camada de olho para trocar nem peça
de chapéu para acrescentar). Humor e nível continuam legíveis pela iluminação da
arena, pela barra de HP e pelo estado de animação, que valem para os dois modos.

### Regras ao mexer aqui

1. **Peça grudada em outra tem a mesma profundidade** (só vale para o rig SVG).
   Orelha e chapéu andam com a cabeça (z=16/18), bandana com o peito (z=8). Só
   protuberância real (focinho, cauda, asas) ganha z próprio — é ela que produz
   a paralaxe. Dar z diferente a uma peça grudada faz ela descolar e flutuar ao
   girar.
2. **CP nunca cai.** Sai de `nivel` + `dias_estudo`, as duas grandezas que o banco
   garante monotônicas. Ofensiva e saldo de XP ficam fora de propósito: um CP que
   despenca depois de um fim de semana mal dado, ou que cai porque o aluno comprou
   proteção, transforma o boneco em cobrança.
3. **Carinho não dá XP.** XP vem de estudar (régua de 11/08). Afeto que paga vira
   tarefa.
4. **Animação só em `transform`/`opacity`**, e o giro é escrito no DOM dentro de um
   `requestAnimationFrame` — passar o ângulo por `useState` custaria um render por
   frame de arrasto.
5. **Espécie nova exige migration**: o CHECK de `pets.especie` *e* a validação
   dentro de `adotar_bichinho()` (as duas listas precisam bater com `ARQUETIPOS`).
   Nunca remover uma espécie da lista — isso deixaria o bicho de quem a adotou num
   estado que a própria tabela recusa.
6. **Nome é por espécie, não por bicho.** `pets.nome` é só o apelido ativo (o da
   espécie corrente); `pets.apelidos` (JSONB, espécie → nome) é quem lembra. Trocar
   de dragão "Fumaça" para lobinho e voltar devolve "Fumaça" — não abre um campo em
   branco. `adotar_bichinho()` escreve nos dois; `apelidoDe()` em `lib/bichinho.ts`
   lê o mapa para pré-preencher o campo de nome na troca.
7. **A Aurora usa a cara do bicho do aluno.** `components/AuroraAvatar.tsx` sonda
   `getBichinho()` e mostra o retrato do bichinho (foto ou vetor, via
   `MascoteRetrato`) no lugar do ícone genérico de robô — na lista de conversas, no
   cabeçalho do chat e no mentor de sala de aula. Sem bicho adotado, ou enquanto
   carrega, continua mostrando o robô — nunca um estado de carregamento visível.

## 🗂 Banco de Dados (Tabelas Principais)

Sempre verifique `/supabase/migrations/` antes de qualquer query — nunca assuma colunas.

| Tabela | Colunas-chave |
|--------|--------------|
| `profiles` | id, full_name, email, role (`admin`/`teacher`/`student`), profile_type, institution, course, exam_target, birth_date |
| `questions` | question_text, options (JSONB), correct_answer, subject_id, micro_topic_id, explanation, target_audience, supporting_text, image_url, exam_board, ativa, motivo_inativa, auditada_em |
| `subjects` | id, name |
| `exams` | id, title, year, exam_type, pdf_url |
| `exam_questions` | exam_id, question_id, order_index |
| `student_question_answers` | student_id, question_id, selected_option, is_correct |
| `exam_attempts` | user_id, exam_id, score, completed_at |
| `essay_submissions` | user_id, theme, content, score, status, created_at |
| `scheduled_lives` | id, title, teacher_id, start_time, meet_url |
| `notes` | id, user_id, title, blocks (JSONB), subject_id, tags (TEXT[]), is_pinned, updated_at, created_at |
| `user_badges` | user_id, badge_id, awarded_at |
| `mural_posts` | tipo (`anuncio`/`trabalho`), titulo, tema, descricao, questoes (JSONB), instrucoes, entrega_em, imagem_url, destaque, ativo, autor_id, autor_nome |
| `mural_conclusoes` | post_id, user_id, concluido_em |

### RLS
Todas as tabelas têm RLS ativo. Filtre sempre por `user_id` ou `role`. Nunca exponha dados de outros usuários.

## 🎨 Padrões de Design & UX

- **Cards**: `shadow-2xl`, bordas `rounded-[2.5rem]`
- **Títulos**: `font-black italic`
- **Feedback**: use **sempre** o hook `useToast` (`src/hooks/use-toast.ts`) para erros e sucessos
- **Responsividade**: mobile-first; sidebar com toggle móvel já implementado no layout

## 🧠 Regras de Desenvolvimento

### Componentes
- Server Components por padrão. `"use client"` apenas quando há estado/interatividade.
- Recharts e qualquer lib que acesse `window`/`document` deve usar `dynamic(..., { ssr: false })`.

### ✍️ Redação: duas bancas, um motor

O motor de correção atende **ENEM e FUVEST**, e a diferença entre elas é **dado, não
código**: `src/lib/bancas.ts` é a fonte única de verdade (mesmo molde de `exam-types.ts`).

| | ENEM | FUVEST |
|---|---|---|
| Critérios | 5 competências (`c1`–`c5`) × 200 | 3 eixos (`dt`, `es`, `ex`) × 50 |
| Grade do corretor | 0/40/80/120/160/200 | 0/10/20/30/40/50 |
| Nota final | **soma** → 0–1000 | **média** → 0–50 |
| Proposta de intervenção | obrigatória (C5) | **não existe** |

**Regras ao mexer aqui:**

1. **A banca é sempre o último parâmetro e sempre opcional, com default ENEM.**
   `snapCompetency`, `total`, `motivosDeDiscrepancia`, `aplicarProtocoloInep`,
   `analisarRedacao` e `evidenciaParaPrompt` seguem esse contrato. É o que faz
   `scripts/test-inep-banca.ts` continuar passando sem alteração — ele é a prova de
   não-regressão do ENEM.
2. **Nunca ramifique por `banca.id` dentro do motor.** Se precisa saber "qual critério é
   o de norma" ou "quais a cópia contamina", isso vira campo da `Banca`
   (`criterioNorma`, `criteriosDeConteudo`), não `if`.
3. **Os prompts são calibrados.** O do ENEM foi ajustado contra correções reais de
   professor — reescrever por estilo muda nota de aluno. Ao mover, confira byte a byte.
4. **A FUVEST nunca pode cobrar proposta de intervenção.** O modelo conhece muito mais
   ENEM que FUVEST e importa o hábito sozinho; por isso existe regra dura no prompt *e*
   o bloco de intervenção é omitido da evidência (`banca.exigeIntervencao`).
5. **Escala na UI é sempre proporcional ao teto**, nunca valor absoluto. `scoreColor`
   usa 80%/60%/40% — com cortes fixos em 800/600/400, um 48 de 50 da FUVEST cairia na
   faixa vermelha.
6. **Gráfico e histórico são separados por banca.** Misturar 0–1000 e 0–50 no mesmo eixo
   achata a curva da FUVEST contra o chão.
7. **`essay_submissions.banca`** (DEFAULT `'enem'`) diz como ler `score` e
   `competencies`. O CHECK de `score` continua `0..1000` de propósito: 0–50 cabe dentro,
   e foi um CHECK de escala errado que barrou toda redação real por dois meses.
8. **A proposta padrão da FUVEST** (`src/lib/propostas/fuvest-nostalgia.ts`) é constante
   de código porque os textos motivadores alimentam `detectarCopia` — um motivador com
   palavra trocada faz a detecção errar em silêncio.

9. **Toda leitura de `essay_submissions` que use `score` PRECISA trazer `banca` no
   `.select()`** e agregar por `src/lib/redacao-metrics.ts` (`mediaRedacao`,
   `agruparPorBanca`, `resumoDaBancaAtiva`). Somar 0–1000 com 0–50 não dá número em escala
   nenhuma: três redações de 800 e uma de 45 viravam "611 pts" na home. Onde só cabe um
   número — tile de dashboard —, use `resumoDaBancaAtiva()` (a banca da redação mais
   recente) e **mostre o teto ao lado**.

**No boletim**, a média da FUVEST tem seção própria, alimentada por `essay_submissions`.
Ela **não** escreve em `report_card_entries*.redacao_score`: aquela é a nota oficial da
secretaria, com fila de aprovação; esta é treino corrigido por IA. Anuladas (nota 0) ficam
fora da média — medem procedimento, não escrita — e são contadas ao lado (`mediaRedacao()`
em `report-card-lib.ts`).

### 📌 Mural: anúncios e pedidos de trabalho

Uma tela só (`/dashboard/mural`) para os dois papéis: quem tem `role` em
`teacher`/`admin`/`staff` vê o compositor, o aluno vê a lista. Sem rota espelho por
cargo — a que existisse a mais ficaria para trás na primeira mudança de layout.

| | `anuncio` | `trabalho` |
|---|---|---|
| Serve para | campanha, cartaz, recado | atividade/pesquisa com prazo |
| `entrega_em` | sempre `NULL` | a data da entrega presencial |
| `questoes` | `[]` | a lista de enunciados |
| No card | imagem em destaque | lista numerada + "já fiz" |

**Regras ao mexer aqui:**

1. **A régua de "pegando fogo" mora em `estaPegandoFogo()` (`src/lib/mural.ts`)** —
   fixado, ou entrega em até 3 dias. O contador do menu (`layout.tsx`) e o card usam a
   mesma função de propósito: um número no menu que não bate com o que o aluno acha ao
   clicar é pior do que não ter contador.
2. **Prazo se conta por data, nunca por hora.** `entrega_em` é `DATE`, então
   `prazoDoTrabalho()` monta a data em hora local. `new Date("2026-09-05")` seria UTC e
   adiantaria o prazo em um dia para quem abre o app à noite em Brasília.
3. **Trabalho vencido não some.** Só o `ativo=false` tira do mural. Quem está atrasado
   ainda precisa ler o enunciado — sumir com ele resolve a estética e não o aluno.
4. **Papel em RLS sai de `profiles.role`** (`pode_publicar_no_mural()`), nunca de
   `auth.jwt()->>'user_role'` — ver a causa-raiz do claim nulo mais acima.
5. **`autor_nome` é congelado na publicação.** O card continua assinado depois que o
   professor sai da escola; `autor_id` só serve para autorizar edição.
6. **`mural_conclusoes` é autodeclaração, não entrega.** A correção é presencial no
   sábado. Nada de anexo de aluno aqui: guardar arquivo de menor abriria uma frente de
   LGPD que a plataforma não precisa ter.

7. **O aviso da home é `pendentesParaHome()`**, em `components/MuralPendenteWidget.tsx`:
   trabalho no ar que o aluno ainda não marcou como feito. **Não tem botão de
   dispensar** — dispensar esconderia a cobrança sem fazer o trabalho, e o aluno
   perderia o sábado achando que resolveu; o jeito de sumir é marcar "já fiz".
   Para de cobrar `DIAS_DE_COBRANCA_APOS_VENCER` (7) dias depois do prazo: aí a
   correção presencial já aconteceu e o aviso vira ruído sobre quem não pode mais
   fazer nada. Sai da home, **não** do mural (ver regra 3).

8. **"Avisar todo mundo" é o único caminho para o banner urgente.** O mural não
   dispara nada sozinho: quem publica precisa pedir, no interruptor do compositor
   ou no botão do card. O aviso cria um `announcements` de `priority='high'` (que
   é o que o `UrgentNotice` lê) e chama `/api/push/notify`. O texto sai de
   `avisoDoPost()`, montado **por orçamento** dentro de `LIMITE_DO_PUSH` (200):
   tema, prazo e "Abra o Mural" entram inteiros e o resumo ocupa o que sobrar —
   cortar o resumo primeiro, com `slice` fixo, estoura o limite e o que se perde
   no fim é justamente a frase que diz onde ler.
9. **`mural_posts.avisado_em` existe para o aviso não sair duas vezes.** Dois
   cliques seriam dois banners e dois pushes para os mesmos ~855 alunos. Se a
   coluna não existir (migration não aplicada), o aviso sai e só a memória se
   perde — nunca o botão inteiro.

Prova de não-regressão: `npx tsx scripts/test-mural.ts` (roda dentro de `npm test`).

### IA Extraction (Motor de Provas)
- Se o enunciado original diz "utilize o texto para responder as questões X a Y", a IA **deve** repetir o `supporting_text` integralmente em **cada** objeto de questão do JSON gerado.
- Se houver referência a imagem/gráfico, insira `[IMAGEM_PENDENTE]` no enunciado.

### 🚫 Questão sem pergunta: a régua de integridade

Uma questão pode chegar ao aluno **sem o enunciado fazer sentido**. O caso que
originou a régua: "A quantia que essa pessoa levava semanalmente para fazer a
compra era" + cinco valores em reais, sem a tabela de compras em lugar nenhum.
Não é questão difícil — é questão sem pergunta. O aluno chuta, erra, e o erro
entra no desempenho dele como se fosse conteúdo que ele não sabe.

**Duas causas, as duas fechadas na entrada:**

1. **ENEM** (`api/enem-import`): `question_text` saía de
   `alternativesIntroduction`, que é só o PÉ do enunciado — o corpo mora em
   `context`. Com `context` vazio (ou só a imagem, que a rota remove), sobrava a
   ponta pendurada. O fallback `?? "Questão N"` era pior: gravava o número como
   se fosse o enunciado.
2. **ETEC** (`scripts/import-etec.ts`): o prompt manda repetir o
   `supporting_text` em cada questão do bloco ("utilize o texto para responder
   às questões 12 a 15"); quando o modelo economiza e entrega só na 12, as irmãs
   ficam órfãs. O filtro antigo olhava forma (imagem, 5 alternativas, gabarito) e
   nunca se ainda havia pergunta.

| Arquivo | Papel |
|---------|-------|
| `src/lib/questao-integridade.ts` | A régua: `diagnosticarQuestao`, `questaoUtilizavel`, `apenasQuestoesUtilizaveis`, `motivoDeBloqueio` |
| `scripts/auditar-questoes.ts` | Relatório do banco, conserto por herança e quarentena |
| `scripts/test-questoes.ts` | Prova de não-regressão (dentro de `npm test`) |
| `supabase/migrations/20260902000000_questoes_integridade.sql` | `questions.ativa`, `motivo_inativa`, `auditada_em` |

**Calibrada contra o banco real (02/09/2026, 3.986 questões).** A primeira versão
acusava 464; depois de conferir amostra por amostra sobraram **93**, e as 371 que
saíram eram falso positivo. O que os dados ensinaram:

| Regra derrubada | Falsos positivos | Por quê |
|---|---|---|
| Fim pendurado (vírgula, `porque`, `pois`, `e`) | ~205 | A frase do ENEM fecha NA ALTERNATIVA: *"…serão, respectivamente,"*, *"…consumo de energia porque"* |
| Abertura por conjunção (`que`, `assim`, `logo`) | 33 | *"Assim sendo, o valor de N…"*, *"Que princípio marcante…"* abrem enunciado legítimo |
| Órfã sem teto de tamanho | 135 | Acima de 300 caracteres o apoio veio DENTRO do `question_text` — a questão está inteira, só mal arrumada |
| Alternativas repetidas em minúsculas | 3 | Genética: `Ee BB` e `ee bb` viravam iguais ao baixar a caixa |

**Regras ao mexer aqui:**

0. **Nada aqui se ajusta sem rodar contra o banco.** Toda régua desta lista errou
   na primeira versão, e nenhuma delas parecia errada no papel. `npm run
   auditar:questoes` sem bandeira não escreve nada — rode, leia as amostras, e só
   então mexa.

1. **Tela e banco usam a MESMA função.** `questaoUtilizavel()` é quem tira a
   questão do simulado, da prova, do flashcard e da questão do dia; é a mesma
   que o script de auditoria usa para desativar. Um filtro de tela que não bata
   com o relatório faz o professor procurar por uma questão que o aluno vê e ele
   não encontra.
2. **A régua erra para o lado do falso negativo.** Evidência ambígua vira
   `bloqueia: false` — entra no relatório, não some da tela. Questão ruim que
   passa custa uma; questão boa apagada em massa custa o banco inteiro.
3. **Metade de `scripts/test-questoes.ts` são casos NEGATIVOS**, e é a metade que
   importa: "o valor pago foi de", "conclui-se que" e "é igual a" terminam em
   preposição, conjunção e artigo e são o formato-padrão de completar do ENEM.
   Uma régua de "fim cortado" que pegasse preposição solta derrubaria a banca
   inteira. Mesma coisa para `tabela periódica` e `figura de linguagem`
   (`EXPRESSOES_FIXAS`): ali a palavra de apoio é conteúdo da matéria, não apoio
   que faltou.
4. **Nunca `.eq('ativa', true)` na consulta.** O filtro é em JavaScript porque a
   coluna só existe depois da migration `20260902000000`; pedi-la ao PostgREST
   num banco sem ela derruba o simulado inteiro com 400 em vez de esconder uma
   questão. (Mesma lição de `mural_posts.avisado_em`.)
5. **O filtro vem ANTES do `slice(0, simSize)`.** Filtrar depois entrega 7
   questões para quem pediu 10.
6. **A auditoria DESATIVA, nunca APAGA.** `student_question_answers.question_id`
   é FK sem cascade — o DELETE falharia justamente nas mais respondidas, e
   forçar o cascade apagaria o histórico do aluno para consertar erro nosso.
   `exam_questions` tem cascade: apagar furaria a prova e as tentativas já
   corrigidas.
7. **O conserto só herda apoio de questão que DECLARA o bloco** ("Texto para as
   questões 12 a 15"), e só para questões dentro da faixa. A versão que herdava
   da vizinha imediata (±2 posições) "consertava" 23 órfãs do banco real e o
   conserto era lixo: *"o instante em que a água dessa piscina terminar de
   escoar"* recebia um texto sobre plaquetas artificiais. No ENEM e na FUVEST
   cada questão tem o SEU texto — vizinhança não significa nada. Questão que
   PARECE inteira e mede a coisa errada é pior do que questão quebrada, porque
   sai do relatório e ninguém mais a encontra.
   No banco atual isso conserta **zero**: só 64 das 3.986 declaram bloco e
   nenhuma tem irmã órfã. Zero é o resultado certo — as 81 órfãs são conserto de
   professor, uma a uma.
8. **O padrão do script é não escrever.** Rode primeiro sem bandeira, leia as
   amostras, e só então `--consertar --desativar`. Quem decide sobre o conteúdo
   do cursinho é o professor.

Fluxo de limpeza:

```bash
npm run auditar:questoes                        # relatório, não escreve nada
npm run auditar:questoes -- --csv               # + questoes-com-defeito.csv
npm run auditar:questoes -- --consertar --desativar
npm run auditar:questoes -- --reativar          # depois de conserto manual
```

### Simulados & Provas
- Renderize `supporting_text` em card destacado **antes** do enunciado.
- Se `image_url` existir, exibi-la no topo do card da questão (prioridade visual).
- Siga padrão ENEM: 3,5 min/questão, navegação por grade, opção de revisão.
- **Flashcard e Questão do Dia também precisam do apoio.** As duas telas nasceram
  sem `supporting_text` no `.select()`, então toda questão de interpretação
  aparecia truncada. A Questão do Dia passou a buscar e renderizar o apoio; o
  flashcard **exclui** questão que dependa de apoio (`cabeNoCartao`) — não cabe
  um texto de dois mil caracteres num cartão de memorização.

### ⛔ Nunca chame o Supabase dentro de `onAuthStateChange`

O callback de `onAuthStateChange` (`src/lib/AuthProvider.tsx`) é **síncrono**, e o
trabalho que depende do Supabase é adiado com `setTimeout(..., 0)`. Isso não é
estilo — é o que impede um deadlock:

`auth.updateUser()` roda inteiro dentro do lock de auth e notifica os inscritos
**de dentro dele**. Qualquer consulta disparada no callback precisa do access
token, que sai de `getSession()`, que tenta o mesmo lock; o lock reentrante
espera a operação de fora terminar, e ela está esperando a notificação. Espera
circular: `updateUser` nunca resolve.

Sintoma real (31/08): a tela de criação de senha do primeiro acesso caía no
timeout de 10s e dizia *"Tempo esgotado. Verifique sua conexão"* — sem nenhuma
relação com a conexão. Atingia todo mundo que chama `updateUser`: os dois passos
do `first-access`, o `reset-password` e o `OnboardingTour`. O login normal
escapava porque `signInWithPassword` notifica **fora** do lock.

Prova: `npx tsx scripts/test-auth-lock.ts` (dentro de `npm test`) monta um
GoTrueClient de verdade e mede os dois jeitos — o antigo trava, o novo resolve.

**Rastro que o defeito deixou:** o aluno atingido teve a senha trocada no
servidor, mas nunca chegou ao passo 2, então `must_change_password` continua
`true` e o middleware o devolve ao `/dashboard/first-access` toda vez. Ao voltar,
ele digita a senha que ele mesmo criou e o GoTrue recusa (`same_password`). Por
isso o passo 1 trata esse erro como sucesso (`ehMesmaSenha()` em
`src/lib/auth-erros.ts`) e segue para o passo 2, que é o que realmente falta.

### Auth & Middleware
- `src/middleware.ts` protege `/dashboard/*` — redireciona para `/login` sem sessão.
- Metadado `must_change_password: true` no Supabase Auth força `/dashboard/first-access`.
- Supabase client browser-side: `src/app/lib/supabase.ts` (use `safeExecute()` para queries com tratamento de erro).

## 🔐 Segurança (LEIA ANTES DE MEXER EM AUTH / API ROUTES)

> Esta plataforma está **em produção** com dados reais de alunos. Trate auth, RLS e
> rotas `/api/*` com o máximo de cuidado. Nunca confie em dados controlados pelo cliente
> para autorização.

### Regras obrigatórias

1. **Rotas privilegiadas usam sessão, não "senha mestra".** Toda rota em `/api/admin/*`,
   reset de senha, criação/exclusão de usuário ou qualquer ação com `SUPABASE_SERVICE_ROLE_KEY`
   **deve** validar o chamador com o helper `requireAdminUser()` / `requireTeacherOrAdmin()`
   de `src/lib/server-auth.ts` (lê o cookie de sessão + checa `profiles.role` no servidor).
   Referência correta: `/api/enem-import`. **Nunca** faça gate via campo `masterPassword`
   no body — ele viaja no bundle do cliente e não é segredo.
2. **`SUPABASE_SERVICE_ROLE_KEY` só no servidor.** Nunca em arquivos `"use client"`, nunca em
   `NEXT_PUBLIC_*`. Ele ignora RLS — qualquer rota que o usa precisa fazer a autorização na mão.
3. **IDOR:** rotas que recebem `userId`/`user_id` no body e leem/escrevem com service role devem
   conferir que o id pertence ao usuário autenticado (`getAuthUser()`), nunca confiar no id do cliente.
4. **HTML dinâmico:** ao montar HTML manualmente (`document.write`, `dangerouslySetInnerHTML`)
   com dados do banco/UI, **escape** os valores (ver `esc()` em `secretary/documents/page.tsx`).
5. **Redirects:** valide `?next=`/`?redirect=` — só aceite caminho interno (`startsWith('/')` e
   não `//`). Ver `auth/callback/page.tsx`.
6. **Filtros Supabase `.or()` / `.ilike()`:** não interpole input cru do usuário (vírgula, `()`, `*`
   são caracteres de controle do PostgREST). Sanitize ou use o builder com valor parametrizado.
7. **Logs:** nunca logar senha, token, e-mail ou nome completo (PII) em `console.*`.
8. **localStorage:** não persista PII/dados acadêmicos sem necessidade; limpe no `signOut`
   (já feito para `dash_cache_*`).
9. **Segredos:** nunca commitar senha/chave/token no código. Use env vars + rotação.

### ⚠️ Pendências de segurança conhecidas (backlog priorizado)

Estas falhas foram auditadas mas **não corrigidas** porque exigem mudança coordenada
servidor+cliente e rotação de segredo (decisão do time):

| Sev | Local | Problema |
|-----|-------|----------|
| ✅ CORRIGIDO | `api/auth/reset-password`, `api/admin/{create-user,delete-user,generate-link,generate-registration-link}` | Antes protegidas só pela string fixa `'compromisso2026'`. **Agora exigem sessão de admin/staff via `requireAdminUser()`.** ⚠️ Ainda falta: rotacionar a senha `'compromisso2026'` (é também `DEFAULT_PASSWORD` de novos usuários) e limpar os literais inertes `masterPassword` nos clientes. |
| ✅ CORRIGIDO (11/08) | `api/student/primeiro-acesso` (action `search`) | Deixou de devolver o `id` do perfil (a tela nunca usou) e ganhou rate limit por IP e por nome, reaproveitando o limitador do reset. O e-mail continua sendo devolvido de propósito: é o login que o aluno precisa descobrir. Fechar isso mataria o primeiro acesso — o que dá para impedir é a varredura. |
| ✅ CORRIGIDO (11/08) | `lib/registration-token.ts` | Passa a usar `REGISTRATION_TOKEN_SECRET`. A chave antiga continua aceita **só na verificação**, para os links já emitidos valerem até expirar (7 dias). Comparação com `timingSafeEqual`. ⚠️ Defina a variável em produção — sem ela, o código cai no legado e avisa no log. |
| ✅ CORRIGIDO | `api/student/weekly-summary` | Usa `getAuthUser()` e ignora o `userId` do corpo. |
| ✅ CORRIGIDO (11/08) | `api/push/notify` (branch `chat`) | O texto não vem mais do corpo: a rota lê a mensagem gravada nos últimos 2 minutos entre remetente e destinatário. Prova que a conversa existe e impede forjar mensagem em nome de outra pessoa. |
| ✅ CORRIGIDO | `api/essay-save` | Exige sessão (`getAuthUser()`) e grava sempre para o usuário autenticado. |
| ✅ CORRIGIDO (11/08) | `api/student/self-register` | Rate limit por IP (40/hora — alto porque uma turma inteira usa o mesmo Wi-Fi). |

**Ação recomendada nº 1:** rotacionar a senha `'compromisso2026'` (é também a senha padrão de
novos usuários) e a `SUPABASE_SERVICE_ROLE_KEY`. São as duas únicas pendências que sobraram
desta lista, e ambas dependem de acesso ao painel.

### ⚠️ Contas duplicadas (descoberto em 11/08/2026)

**201 alunos têm mais de uma conta** — 403 contas, 202 excedentes. A base tem 1.057 contas
para cerca de 855 alunos reais. "Abner de Jesus Jales da Silva" tem TRÊS contas, cada uma com
um pedaço do boletim.

Causa: `generateEmail()` deriva o login do nome, e a regra mudou ao longo do tempo —
`abnerjsilva@` (inicial do primeiro nome do meio), `abnerdsilva@` (inicial da segunda palavra,
que aqui é a preposição "de") e `abnersilva@` (regra de duas partes). Como nomes com preposição
são a maioria em português, isso atingiu metade do cadastro.

`create-user` passou a recusar nome já existente (com saída por `emailOverride` para homônimos
reais), então o problema não cresce. **Fundir as contas existentes continua pendente e é decisão
da secretaria** — escolher qual sobrevive é escolha sobre o histórico do aluno.
Relatório: `npx tsx scripts/duplicatas-de-alunos.ts --csv`.

### 🔒 Auditoria de RLS + Edge Functions (2026-07-10) — aplicado em produção

Auditoria completa do banco (Supabase security advisor) + edge functions. Correções
já **aplicadas em produção** e versionadas em `/supabase/migrations` e `/supabase/functions`:

| Sev | Local | Correção |
|-----|-------|----------|
| ✅ CRÍTICO | `direct_messages` e ~30 tabelas (`profiles`, `essay_submissions`, `student_question_answers`, `material_annotations`, `simulation_attempts`, `invitations`, fóruns, lives, trilhas, materiais…) | Policies residuais de "modo demo" (`Acesso Demo`, `open_*`) com `USING/WITH CHECK true` anulavam as restritas via OR. Em `profiles` permitia escalada de privilégio (qualquer autenticado alterava o próprio `role`). **Removidas; mantidas/criadas policies por dono ou papel.** Migrations `20260710010000`/`020000`/`030000`. ⚠️ **A remoção NÃO fechou a escalada** — ver linha abaixo. |
| ✅ CRÍTICO | `profiles.role` (escalada de privilégio) | Remover as policies abertas não bastou: as policies de dono que ficaram (`auth.uid() = id`) valem para **qualquer coluna**, inclusive `role`, e a tabela não tinha trigger nenhum. Confirmado por simulação de RLS em 2026-07-29: como aluno autenticado, `UPDATE profiles SET role='admin' WHERE id=<ele mesmo>` era aceito sem erro. **Corrigido** pelo trigger `trg_profiles_block_role_escalation` (migration `20260729090000`), que barra a troca de papel em sessão de usuário comum e mantém `service_role` e admin/staff. A edição legítima do próprio perfil (telefone, nome, avatar) continua funcionando. |
| ✅ CRÍTICO | 8 tabelas com RLS **desligada** (`trails`, `classes`, `user_progress`, `student_checklists`, `activity_logs`, `forum_bans`, `library_items`, `subjects`) + `learning_trails`/`learning_modules`/`notices`/`quiz_submissions` | **RLS religada** com policies mínimas corretas. |
| ✅ CRÍTICO | edge function `learning-trails-crud` | SQL injection (concatenação de string com `id` da URL) + JWT sem verificar assinatura, rodando com service role. **Reescrita** para usar supabase-js com o JWT do chamador (RLS + query builder parametrizado). |
| ✅ CRÍTICO | edge functions `delete-all-students-only`, `reset-students-only`, `reset-user-password-next-login`, `create-auth-users`, `backfill-teachers-auth` | Rodavam com service role gateadas só por `verify_jwt` (qualquer sessão, até de aluno) — permitiam apagar todos os alunos, resetar/assumir a conta admin, escalar privilégio. **Adicionado guard `requireAdmin` (checa `profiles.role='admin'`).** Não são usadas pelo app (scripts one-off). |

**Pendências desta auditoria (backlog):**
| Sev | Local | Problema |
|-----|-------|----------|
| 🟡 MÉDIO | edge functions `request-password-reset`, `invite-send-magiclink` | Ainda gateadas só por `verify_jwt`. Podem fazer parte de fluxos deslogados (reset/convite) — revisar se são usadas antes de blindar. Enumeração de e-mail em `request-password-reset`. |
| 🟡 MÉDIO | Views `SECURITY DEFINER` (`profile_public`, `profiles_public`, `weekly_ranking`) e ~14 funções `SECURITY DEFINER` executáveis por `anon`/`authenticated` | Revisar se o `SECURITY DEFINER` é intencional; senão trocar por `SECURITY INVOKER` ou revogar `EXECUTE`. |
| 🟢 BAIXO | Buckets públicos `avatars`/`exam_pdfs`/`learning-contents` com SELECT amplo (listagem) + proteção de senha vazada (HaveIBeenPwned) desligada no Auth + `function_search_path` mutável em ~15 funções | Hardening de menor prioridade. |

**⚠️ Rotacionar a `SUPABASE_SERVICE_ROLE_KEY`:** foi exposta em texto puro num chat durante a auditoria.

#### 🐛 Causa-raiz descoberta: claim `user_role` do JWT é sempre `null`

Não existe *custom access token hook* configurado no Auth, então **`auth.jwt() ->> 'user_role'`
(e `get_my_claim('user_role')`) retornam `null` para os 1622 usuários**. Toda policy que
gateia por esse claim **nunca concede acesso** — era mascarado pelas policies abertas.
Ao removê-las, operações legítimas quebraram. **Regra:** para papel em RLS, use sempre
`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN (...))` —
**nunca** `auth.jwt()->>'user_role'`. (Fix definitivo de longo prazo: criar o hook de
access token OU migrar as poucas policies mortas restantes.)

Regressões corrigidas na revisão completa de RLS (migrations `050000`/`060000`, verificadas
por simulação de RLS `set role authenticated` + `request.jwt.claims`):
- `forums`/`forum_bans` (moderação de fórum: criar/apagar tópico, banir/desbanir) → `profiles.role` admin/staff.
- `modules`/`learning_contents`/`library_resources` (gestão de conteúdo) → `profiles.role` admin/staff/teacher.
- `student_question_answers` (admin/professor viam desempenho do aluno vazio) → SELECT por `profiles.role`.

Policies mortas remanescentes **sem impacto** (feature não usada client-side ou coberta por
outra policy): `subjects`, `live_messages` (moderador), `classes` (admin gerencia de outros),
`announcements` (admin edita de outros), `questions` (redundante). Nota menor de exposição:
`forums.open_select_for_authenticated_forums` (true) deixa fóruns `is_teacher_only` visíveis a
alunos — revisar se a confidencialidade importa.

### 📱 Plano: reset de senha & primeiro acesso (telefone + SMS) — FASE 2 IMPLEMENTADA

Decisão de produto: **não armazenar CPF**; usar **telefone** como base da recuperação
(minimização de dados / LGPD). Observação importante: os e-mails `@compromisso.com` são
sintéticos (login interno, sem caixa de e-mail real), então recuperação por e-mail não é opção.

**Princípio de segurança:** o telefone NÃO é segredo. Nunca validar "digitando o número".
A prova de identidade é **posse do aparelho** → enviar **OTP via SMS para o número já cadastrado**.

Fases:
1. **Telefone obrigatório (gate):** ✅ **IMPLEMENTADO** — `src/components/PhoneGate.tsx`, montado em
   `src/app/dashboard/layout.tsx`. Bloqueia o dashboard para aluno sem telefone, igual ao
   `must_change_password`, com saída por "Sair da conta" para não prender ninguém na tela.
   ⚠️ **Cobertura ainda baixa:** em 2026-07-29, **224 de 1110 perfis** têm telefone (20%); entre
   alunos, **834 de 1058 estão sem**. O gate só alcança quem faz login a partir de agora, então
   a Fase 3 (fallback pela secretaria) segue necessária para quem não acessa há tempo.
2. **Reset self-service por SMS OTP:** ✅ **IMPLEMENTADO** — aluno informa o nome → servidor acha a conta → envia
   OTP ao telefone cadastrado → valida OTP → permite trocar a senha. Integração com provedor SMS
   (Twilio). Detalhes da implementação em `docs/superpowers/plans/2026-07-08-forgot-password-sms-otp.md`.
   ⚠️ Pendente: a action `search` (usada pelo fluxo de primeiro acesso, separada da recuperação por
   SMS) ainda devolve `userId`/`email` e permite enumeração de usuários — blindar antes de expor
   publicamente.
3. **Fallback permanente (os dois):** quem não tem telefone → a **secretaria reseta direto**
   pelo painel **ou** **gera link de recuperação** (`generate-link`), à escolha dela. Adequado
   para cursinho presencial (prova de identidade offline). *(Pendente)*

### Já corrigido nesta auditoria (mudanças seguras, sem quebrar fluxo)
- Open-redirect em `auth/callback` (valida `next` interno).
- XSS armazenado no gerador de documentos da secretaria (escape de HTML).
- Redação de PII (nome/e-mail) nos logs de `primeiro-acesso`.
- Sanitização do filtro `.or()` em `primeiro-acesso`.
- Limpeza do cache acadêmico (`dash_cache_*`) no `signOut`.

## 📌 Estrutura de Rotas Relevantes

```
/dashboard/
├── admin/
│   ├── users/          # Diretório de usuários (criar, editar, resetar senha)
│   ├── students/       # Gestão de turmas
│   └── students/[id]/  # Perfil de desempenho individual do aluno
├── student/
│   ├── notes/          # Caderno de notas (blocos, wikilinks, backlinks)
│   └── notes/graph/    # Graph View (grafo de conhecimento)
├── teacher/
│   ├── questions/      # Banco de questões
│   └── analytics/      # BI & analytics
└── mural/              # Anúncios e pedidos de trabalho (lista p/ todos, composer p/ staff)
```

## 🔑 Variáveis de Ambiente

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
OPENAI_API_KEY  (server-side only)
PASSWORD_RESET_TOKEN_SECRET  (server-side only — secret dedicado do wizard de recuperação por SMS)
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

## 📌 Pastas Importantes

- `/src/app/dashboard`: Rotas por cargo (student/teacher/admin)
- `/src/components/ui`: Componentes base Shadcn
- `/src/lib`: `AuthProvider`, `gamification`, `constants` (escolas, matérias), `utils` (`cn()`)
- `/supabase/migrations`: Fonte da verdade do schema — ler antes de qualquer query
- `/public/templates`: Templates JSON de provas
