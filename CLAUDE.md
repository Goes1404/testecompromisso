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
| `questions` | question_text, options (JSONB), correct_answer, subject_id, micro_topic_id, explanation, target_audience, supporting_text, image_url |
| `subjects` | id, name |
| `exams` | id, title, year, exam_type, pdf_url |
| `exam_questions` | exam_id, question_id, order_index |
| `student_question_answers` | student_id, question_id, selected_option, is_correct |
| `exam_attempts` | user_id, exam_id, score, completed_at |
| `essay_submissions` | user_id, theme, content, score, status, created_at |
| `lives` | id, title, description, start_time, status (`scheduled`/`live`/`completed`), teacher_id, teacher_name, meet_link, youtube_url, youtube_id |
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

### 📺 Aulas ao vivo: YouTube para todos, Meet para quem fala

Tabela `lives` (a `scheduled_lives` é legado de demo: o app não lê). Telas:
`/dashboard/live` (aluno), `/dashboard/teacher/live` (agenda + edição) e
`/dashboard/teacher/live/[id]` (estúdio). Regras puras em `src/lib/lives.ts`.

**Regras ao mexer aqui:**

1. **O aulão vai pelo YouTube, não pelo Meet.** O Meet grátis corta em 100 pessoas
   e em 60 minutos; o cursinho tem ~855 alunos. O professor cria a transmissão
   **não listada** no YouTube Studio, *pelo computador* (pelo celular o YouTube
   exige 50 inscritos e limita o público até 1.000), e cola o link. O player é
   embutido na sala do aluno (`components/live/PlayerDoYoutube.tsx`). O Meet fica
   como sala opcional para quem quer falar.
2. **`youtube_id` é a fonte da verdade; `youtube_url` é só o que o professor
   colou.** `idDoYoutube()` aceita os formatos que se cola na prática e recusa o
   link do *canal* (`/@canal/live`), que não aponta para uma aula. O player
   revalida o id ao renderizar — a coluna aceita qualquer texto.
3. **O iframe precisa mandar referrer** (`strict-origin-when-cross-origin`): sem
   ele o YouTube mostra "erro 153". E nada de `autoplay` — o celular bloqueia som
   automático e o aluno acha que a aula está muda.
4. **A agenda do aluno é `estaNaAgenda()`.** No ar: aparece até 12h depois do
   início (passou disso, o professor esqueceu de encerrar). Agendada: até 3h de
   atraso. O corte antigo de 1h fixo tirava o aulão da lista no meio dele.
5. **O status só anda para frente:** agendada → no ar → encerrada (`proximoStatus()`).
   O antigo "Fechar sala" voltava para agendada e a aula que terminou reaparecia.
6. **UPDATE/DELETE em `lives` sempre com `.select()`.** Sem policy, o Supabase não
   dá erro — devolve 0 linhas — e a tela dizia "Sala removida" com a sala lá.
7. **Policy de escrita:** migration `20261012120000_lives_write_policy.sql`
   (admin/staff/teacher por `profiles.role`). A limpeza de 10/07 tinha deixado a
   tabela só com SELECT, e nenhum professor conseguia agendar. Aplicada no
   educore em 12/10 e verificada por simulação de RLS: professor agenda e abre a
   sala; aluno lê, mas não cria nem altera link; sem login não lê nada (a
   leitura `TO public` saiu — `meet_link` é a única tranca da sala do Meet).

8. **Turma é `profiles.sala`, normalizada.** O cadastro tem "5", "05", "sala 5" para
   a mesma sala; `public.sala_normalizada()` e `normalizarSala()` (TS) viram tudo em
   "5" — as duas precisam bater. ETEC = salas 1–6, ENEM = 7–12. `lives.turmas` guarda
   as salas escolhidas; vazio = todas, inclusive quem está sem sala. A restrição é RLS
   (`pode_ver_live()`), não filtro de tela. ⚠️ Em 13/10, ~200 alunos ativos estavam
   sem sala no cadastro: eles **não veem** aula restrita a turmas.
   **Por foco (17/10):** `lives.turmas` também aceita `'ENEM'`/`'ETEC'`, comparados com
   `profiles.exam_target` (`public.foco_normalizado()` = `normalizarFoco()`). "Todo o ETEC"
   no formulário grava `['ETEC']`: vale para todo aluno ETEC, **com ou sem sala** (222 sem
   sala em 17/10). Foco "Não informado" não vê aula por foco. Migration
   `20261017090000_lives_por_foco.sql` (`pode_ver_live`, `alunos_esperados_da_live` e o
   rótulo da chamada em `fechar_chamada_da_live`, que fazia `t::int` em todo item).
   **`FocoGate`** (`components/FocoGate.tsx`, montado no layout por cima do `PhoneGate`):
   aluno sem foco ENEM/ETEC é obrigado a escolher antes de qualquer coisa — sem foco ele
   não vê aula nenhuma (65 alunos ativos em 17/10). Grava `profiles.exam_target`.
9. **Chamada da live é por tempo, sem código** (decisão da coordenação, 13/10):
   presente quem ficou **60%** do tempo em que a aula esteve no ar com a sala aberta.
   A sala chama `registrar_presenca_live()` a cada 60 s; o banco soma o tempo real
   entre sinais, **até 130 s por sinal** — metralhar sinais soma zero e sumir não
   conta. O cronômetro da aula (`segundos_no_ar`/`no_ar_desde`) só o gatilho mexe.
   Prova só que a página estava aberta, não atenção.
10. **Encerrar gera a chamada** (`fechar_chamada_da_live()`, por gatilho): cria a
    `class_sessions` (`session_type='live'`, `live_id`) e grava presente/ausente com
    `method='app'` para todos os esperados. **Nunca sobrescreve** o que a secretaria
    marcou à mão. Reabrir e encerrar recalcula. Aula com menos de 10 min no ar não gera
    chamada (professor que abriu sem querer não pode marcar ~855 faltas).
    ⚠️ Contas duplicadas (ver abaixo) entram como esperadas e saem como ausentes.
11. **`live_presencas` não tem policy de escrita.** Só a função SECURITY DEFINER grava;
    senão o aluno escreveria "fiquei 2 horas" direto na tabela.

12. **Dúvidas vão para o professor, não para a sala** (`live_messages`, migration
    `20261014120000_live_duvidas.sql`). O aluno vê só as próprias dúvidas e a resposta;
    a equipe vê todas. Dois motivos: o Realtime do Supabase aguenta **200 conexões no
    Free e 500 no Pro**, e o aulão tem ~855 alunos — um chat aberto empurraria cada
    mensagem para cada aluno; e mural aberto entre adolescentes durante a aula é frente
    de bullying. Por isso **só a equipe assina o Realtime** de dúvidas; o aluno
    reconsulta a cada 30 s, e só enquanto tem dúvida pendente.
13. **O banco decide autor e nome da dúvida** (gatilho `live_messages_ao_inserir`):
    `user_id`, `user_name` (de `profiles`), hora e estado de resposta que vêm do
    cliente são descartados. Limites por aluno: 1 dúvida a cada 20 s, 20 por aula, até
    500 caracteres, só com a aula no ar. A equipe responde, marca "respondi na aula" ou
    **oculta** (o registro fica); só admin/staff apagam. Ninguém reescreve a pergunta.
14. **A sala e a lista do aluno não usam Realtime nenhum** (desde 15/10; antes a sala
    assinava `postgres_changes` em `lives` como atalho). Com ~855 alunos e 200 conexões
    no plano, 655 celulares ficariam o aulão inteiro tentando reconectar. A sala relê a
    aula por intervalo (agendada 15 s, no ar sem vídeo 6 s, no ar com vídeo 20 s) e ao
    voltar para a aba; a lista relê a cada 30 s. O sinal de presença (60 s) também traz
    o status. Cada releitura custa ~0,1 ms no banco. Só a equipe (estúdio, dúvidas)
    assina Realtime — são poucas conexões.

15. **Desenho separado de dado.** As telas são componentes que só recebem props —
    `ListaDeAulas`, `SalaDoAluno`, `EstudioDoProfessor`, `AgendaDoProfessor`,
    `QuadroDeDuvidas`, `FilaDeDuvidas`, `ResumoDaChamada` — e as páginas e os
    containers (`DuvidasDoAluno`, `DuvidasDoProfessor`, `PainelDaChamada`) buscam e
    gravam. É o que deixa revisar o desenho com dados de exemplo, sem login: a prévia
    `/dev/live-preview?tela=lista|sala|sala-agendada|agenda|estudio|estudio-agendado`
    (só fora de produção) monta cada tela com dados de exemplo — é dela que saem as
    capturas de celular (360×740) e computador (1366×768) das revisões. Estilo no
    molde do Mural: cartão escuro `CARTAO` (`components/live/pecas.tsx`) sobre o fundo
    claro do app, laranja da marca, sem rótulo de enfeite ("Ambiente auditado",
    "Sinal habilitado" saíram — não diziam nada ao aluno).
16. **A sala do aluno é "app de live" e é "full bleed"** (14/10; antes era página com
    rolagem). No celular a página **não rola**: cabeçalho da sala, vídeo, abas
    (Chat · Dúvida · Info) e a aba ocupa o resto — o chat estica até o campo de digitar
    (`ChatDaAula preencher`). A barra de cima do app some nessa rota abaixo de `lg`
    (`isSalaAoVivo` no layout); a sala tem o próprio voltar. Motivo: rolagem dentro de
    rolagem (página + chat) fazia o arrasto "travar" — o dedo que começava no chat
    mexia no chat, o de fora mexia na página. No computador: vídeo, Meet e pauta à
    esquerda (só essa coluna rola), chat na coluna da direita inteira; a aba Info não
    existe. O chat fica montado ao trocar de aba (não recarrega nem perde a rolagem).
    Medido em 360×640, 375×740, 414×896, 1366×768 e 1920×1080: campo de digitar sempre
    visível e página sem rolagem. O estúdio do professor também é full bleed.

17. **(Substituído pela regra 18 em 13/10 — fica de reserva.)** O chat da aula era o chat ao vivo do próprio YouTube (`ChatDoYoutube`), em aba
    ao lado de "Dúvida privada". O comentário vai para o YouTube e o professor lê no
    YouTube Studio. **No computador** vem embutido (`live_chat?v=…&embed_domain=<host>`
    — o domínio precisa bater, por isso é lido de `window.location`). **No celular o
    YouTube não libera chat embutido** (ajuda oficial: "isn't available on mobile web"),
    então vira botão "Comentar no YouTube", com o aviso de que a presença só conta com a
    sala aberta. O chat só existe com a transmissão no ar, não listada ou pública, com
    incorporação permitida, chat ativado e público "não é para crianças" — o passo a
    passo do estúdio lembra o professor disso. Verificado em 14/10 com uma transmissão
    pública real: vídeo e chat (com mensagens) carregaram no computador; no celular, o
    vídeo carrega e o chat vira o botão.
    **Por que não um chat nosso repassado pela API do YouTube:** a mensagem sairia com o
    nome do canal do cursinho, não do aluno, e a cota grátis (`liveChatMessages.insert` =
    20 unidades de 10.000/dia) cobre ~500 mensagens por dia.

18. **O chat da aula é nosso, dentro da plataforma** (`ChatDaAula` → `ChatAoVivo`,
    tabela `live_chat`, migration `20261015120000_live_chat.sql`). Motivo: no celular o
    YouTube não deixa embutir o chat dele, e o aluno saía da sala (e da presença) para
    comentar. O professor vê o mesmo chat no estúdio e modera por toque.
    - **Leitura por consulta incremental, não Realtime** (200 conexões no Free): a sala
      chama `chat_da_live(live, desde)` a cada 5 s (aluno) / 3 s (equipe), só com a
      aula no ar e a aba visível, e recebe só o que mudou desde a última `versao`.
      O ritmo do aluno é adaptativo (`proximoIntervaloDoChat`): 3 consultas sem
      novidade → 7 s, 6 → 10 s; mensagem nova (ou enviada por ele) volta a 5 s, com
      ±10 % de variação para os celulares que entraram juntos não baterem no banco no
      mesmo instante. Medido em 15/10: `chat_da_live` custa 0,4 ms no banco — o que
      pesa é o número de pedidos na porta (PostgREST), não a consulta.
    - **`versao` sai de sequência e muda em toda alteração.** É o que faz a mensagem
      ocultada sumir da tela de quem já a tinha: ela volta sem texto e
      `mesclarMensagens()` tira da lista. Ordem na tela é por `id`, nunca por versão.
    - **O aluno não lê `live_chat` direto** (SELECT só da equipe); tudo pela função,
      que esconde o texto das ocultas. Com RLS escondendo a linha, a ocultação nunca
      chegaria a quem já tinha a mensagem.
    - **O banco decide autor, nome, hora e `equipe`** (gatilho). Aluno: só com a aula no
      ar, 1 mensagem/10 s, 300 caracteres, 150 por aula, não silenciado
      (`live_chat_silenciados`). Equipe oculta/reexibe e silencia/libera; nada é apagado
      por quem modera, só admin/staff apagam.
    - Sem a migration no banco, `ChatDaAula` mostra o chat do YouTube (`reserva`).
    - Testado em Postgres local com cópia de `pode_ver_live`/`sala_normalizada` (13
      cenários de RLS). Prova das regras de tela: `scripts/test-live-chat.ts`.

19. **Voltar à sala não recarrega nada na frente do aluno** (`src/lib/cache-da-sessao.ts`).
    Lista, sala e chat abrem com o último estado (memória do módulo + `sessionStorage`)
    e a consulta atualiza por trás; o chat retoma da `versao` guardada e só pede o que
    mudou. Chaves `dash_cache_<userId>_…`, apagadas no `signOut` e no `SIGNED_OUT`.
    Falha de rede com a sala já na tela **não** expulsa o aluno (só `PGRST116`).
    No celular o chat não usa `overscroll-contain`: arrastar no fim do chat continua
    rolando a página. No computador a lista do chat é `calc(100dvh − …)` para o campo
    de digitar caber num notebook de 768px. Prova: `scripts/test-cache-da-sessao.ts`.

20. **Chat leve em celular fraco.** `LinhaDoChat` é `memo`: mensagem nova, digitação e
    presença redesenham só a linha que mudou (antes, as até 200 linhas a cada evento:
    congelamentos de 130–220 ms com CPU 6× mais lenta). `horaDaMensagem` usa um
    formatador só (criar `Intl.DateTimeFormat` por linha era caro), `corDoNome` tem
    cache, a posição da rolagem é `ref` (rolar não redesenha), e o `sessionStorage` do
    cache é gravado adiado (1,5 s ou ao esconder a aba). Abaixo de `lg`, cabeçalho e
    barra inferior do app não usam `backdrop-blur` (desfoque sobre conteúdo que rola é
    caro no celular). Medição: 0 tarefas longas arrastando o chat com mensagens chegando
    a cada 0,7 s (antes 8, pior 183 ms).

21. **O vídeo é conferido com o YouTube antes de abrir a sala** (`src/lib/live-video.ts`,
    rota `/api/live/verificar-video`, só equipe). O oEmbed do YouTube diz pelo status se o
    vídeo abre para o aluno: 200 abre, 401 incorporação desligada, 403 privado, 400/404 não
    existe. Esses "não" são **definitivos** e barram o "Abrir para alunos" com a mensagem de
    onde consertar; qualquer outra resposta (YouTube fora, timeout, 429) é "não deu para
    perguntar" e **não barra** — a aula não fica refém do oEmbed. O estúdio confere ao
    abrir e de novo na hora de abrir a sala (o professor pode ter mudado a visibilidade no
    YouTube Studio). Pelo servidor porque o oEmbed não libera CORS. Nada é gravado.
    Prova: `scripts/test-live-video.ts`.

22. **Ensaio de carga antes do aulão:** `scripts/ensaio-da-live.ts` cria N contas de
    ensaio (sala 99, `@compromisso.test`) e uma aula no ar restrita a essa sala, e faz
    cada "aluno" bater no PostgREST como a tela bate (chat 5 s, presença 60 s, aula
    20 s, uma mensagem a cada 45 s), medindo p50/p95/p99 e erros. Precisa do
    `SUPABASE_JWT_SECRET` para assinar um token por aluno (o GoTrue limita logins por
    IP). Apaga tudo no fim; `--manter` guarda as contas e `--limpar` apaga o que
    sobrou — contas de ensaio mantidas entram como ausentes na chamada de aula para
    todas as turmas. Roteiro completo do dia: `docs/aulao-dia-d.md`.

Migration: `20261013120000_lives_turmas_e_presenca.sql`, testada num Postgres local
com cópia das tabelas e policies de produção. Ela também fecha a falha de `ar_insert`
(o aluno se marcava presente em qualquer aula sem código, direto pelo banco). O app
funciona sem ela — sem turmas, sem contador e sem chamada — para o deploy não depender
da ordem.

21. **Aula só pelo Meet é aula, não falta de link** (14/10). Sem `youtube_id` e com
    `meet_link`, o palco da sala vira "A aula está no Meet" com o botão laranja
    **Entrar no Meet** (`PalcoDeEspera`), e o cartão "Quer falar com o professor?"
    some (seria o mesmo link duas vezes). No estúdio, "Aula pelo Meet" com "Abrir o
    Meet" e passo a passo próprio — nada de "Falta o link do YouTube". Limite do Meet
    grátis continua valendo (100 pessoas, 60 min): turma grande vai pelo YouTube.
    A transmissão de tela pela própria plataforma (Cloudflare Realtime) foi feita e
    **retirada a pedido** no mesmo dia — não reintroduzir sem pedido
    (`20261016130000_lives_sem_transmissao.sql`).

Prova de não-regressão: `npx tsx scripts/test-lives.ts` (roda dentro de `npm test`).
### 📺 Lives: aviso aos alunos

Toda live gera **dois avisos aos alunos das turmas da aula** (push + sininho), via
`/api/push/notify` com `{ type: "live", liveId, event }`:

| evento | quem dispara | coluna de memória |
|---|---|---|
| `agendada` | `teacher/live` ao criar a sala | `lives.avisado_agendada_em` |
| `ao_vivo` | `teacher/live/[id]` ao ligar o sinal | `lives.avisado_ao_vivo_em` |

1. **A rota marca antes de enviar** (`UPDATE … WHERE coluna IS NULL`): ligar e
   desligar o sinal para testar o Meet não repete o push para ~1.000 alunos.
2. **O texto sai da live gravada** (`avisoDaLive()` em `src/lib/live-aviso.ts`),
   nunca do corpo; `ao_vivo` só sai se o status no banco for `live`.
3. **Horário no fuso da escola** (`America/Sao_Paulo`) — o servidor roda em UTC.
4. **Fan-out sempre por `idsDeAlunos()`** (`lib/push.ts`): pagina de 1.000 em
   1.000 (o PostgREST corta aí e a base já passou disso) e a busca de
   subscriptions vai em lotes, porque um `.in()` com a escola inteira estoura o
   limite de URL e o envio terminava em "0 enviados" calado.
5. **O aviso respeita `lives.turmas`** (`idsDeAlunosDasSalas()`): aula das salas 1 e
   2 não notifica a escola inteira — o resto nem consegue abrir a sala (RLS). Lista
   vazia = todas as turmas. Sem a coluna (migration de turmas não aplicada), avisa
   todo mundo, como antes.

Prova: `npx tsx scripts/test-live-aviso.ts` (dentro de `npm test`).

### 📅 Data da aula e aula no ar

- **Aula no ar conta a validade de `lives.no_ar_desde`**, gravado pelo professor ao
  abrir a sala — não do `start_time` agendado. Em 13/10 uma aula salva com o ano
  2007 foi aberta, o push de "ao vivo" saiu e ela não apareceu para nenhum aluno.
- A consulta do aluno usa `filtroDaAgenda()`: toda aula `live` entra, agendadas só
  a partir do piso. Nunca corte aula no ar pelo `start_time` no banco.
- O formulário do professor passa por `validarHorarioDaAula()` (até 1 dia no
  passado, até `ANTECEDENCIA_MAXIMA_DIAS` à frente). Na edição, só se o horário mudou.

### 📱 Mobile

- A tela do aluno é medida em **360px**. Título de card não usa `truncate`
  (o aluno precisa ler qual é a aula) e botão de ação é `w-full` no celular.
- Altura de tela cheia é `100dvh`, nunca `100vh`/`h-screen`: no Safari/Chrome do
  celular o `100vh` inclui a barra do navegador e corta o rodapé (botão de enviar,
  "próxima questão").
- Os botões flutuantes (Aurora e Feedback) somem no celular nas telas de digitação
  — lista em `escondeFlutuantesNoCelular()` (`src/lib/floating-ui.ts`). Eles caíam
  em cima do botão de enviar.

### IA Extraction (Motor de Provas)
- Se o enunciado original diz "utilize o texto para responder as questões X a Y", a IA **deve** repetir o `supporting_text` integralmente em **cada** objeto de questão do JSON gerado.
- Se houver referência a imagem/gráfico, insira `[IMAGEM_PENDENTE]` no enunciado.

### Simulados & Provas
- Renderize `supporting_text` em card destacado **antes** do enunciado.
- Se `image_url` existir, exibi-la no topo do card da questão (prioridade visual).
- Siga padrão ENEM: 3,5 min/questão, navegação por grade, opção de revisão.

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

### 🔑 Link de senha (primeiro acesso e redefinição)

A secretaria gera um link por aluno (`/api/admin/generate-link`, só admin/staff): o
"Link de Primeiro Acesso" logo depois de criar a conta e o "Link de Reset" em Usuários.
**Os dois são o mesmo link** e servem para criar ou redefinir a senha. Regras puras em
`src/lib/link-de-senha.ts`; tela em `/reset-password`.

1. **Token `recovery` para os dois.** O `invite` do Supabase só existe para conta que ainda
   não existe; aqui a conta é criada antes (`create-user`, `email_confirm: true`) e o
   Supabase recusava o convite com "e-mail já cadastrado". Até 16/10 o Link de Primeiro
   Acesso nunca saía.
2. **O link aponta para a nossa tela com `token_hash`**, nunca para o `action_link` do
   Supabase. O link antigo entregava a sessão no `#access_token`, e o cliente do
   `@supabase/ssr` (fluxo PKCE) recusa esse formato: todo link caía em "Link expirado".
3. **O token só é usado no toque em "Continuar"** (`verifyOtp`). A prévia do WhatsApp abre
   o endereço para montar o cartão; troca automática gastaria o link de uso único.
4. **O formulário só aparece depois de validar ESTE link nesta visita.** A tela antiga
   aceitava qualquer sessão aberta no navegador e trocava a senha de quem estava logado
   (a secretaria testando, o irmão no mesmo celular), não a do aluno do link. Se houver
   alguém logado, a tela avisa; validar o link substitui a sessão sem `signOut` (o
   `AuthProvider` manda para `/login` em todo `SIGNED_OUT`).
5. **Redefinir pelo link de cadastro em massa (`/primeiro-acesso?invite=`) NÃO existe, de
   propósito.** Esse link circula nos grupos: redefinir por nome deixaria qualquer um trocar
   a senha de qualquer colega. Lá, quem já trocou a senha padrão é mandado para o SMS
   (`/forgot-password`) ou para a secretaria.
6. **O link vale 24 h e funciona várias vezes** (pedido da coordenação, 16/10): é
   `/reset-password?convite=<token>`, assinado pela plataforma
   (`src/lib/link-de-senha-token.ts`, HMAC com `LINK_SENHA_SECRET` ou, na falta,
   `PASSWORD_RESET_TOKEN_SECRET`), porque o token do Supabase é sempre de uso único e de
   1 h. Conferir e gravar ficam no servidor (`/api/auth/link-de-senha`, sem sessão — o link
   é a prova), e a tela entra com a senha nova em seguida. Como o link deixa de ser de uso
   único, um link encaminhado vale 24 h; as travas são:
   - **gerar outro cancela o anterior** (`app_metadata.link_senha_versao`, que o aluno não
     consegue escrever);
   - no máximo **10 trocas por link** e 30 tentativas por IP por hora
     (`password_reset_attempts`, identificador = hash do token);
   - **toda troca avisa o aluno no sininho** ("se não foi você, procure a secretaria");
   - conta arquivada ou bloqueada é recusada.
   ⚠️ Os dois limites ficam **desligados no fim de semana de 17–18/10** (mutirão de senhas,
   turma inteira no mesmo Wi-Fi) e voltam sozinhos em 19/10 00:00 de Brasília
   (`SEM_LIMITE_ATE` na rota). O aviso no sininho e a versão do link continuam valendo.
   Sem nenhum dos dois segredos, `generate-link` volta ao link de 1 h do Supabase
   (`?token_hash=`), e a tela da secretaria mostra a validade do link que saiu
   (`validadeDoLink()`). Os links de 1 h já enviados continuam funcionando.
7. **Links em lote** (`/dashboard/admin/links-de-senha`, rota `/api/admin/generate-links-lote`,
   só admin/staff, até 300 por vez): a secretaria filtra por sala ou nome, marca os alunos e
   copia "nome + link" de cada um ou a mensagem pronta para o WhatsApp (`mensagemDoLink()`).
   Mesmo link do avulso (`emitirLinkDeSenha()` em `src/lib/link-de-senha-emitir.ts`), então
   gerar de novo cancela o anterior — a tela avisa antes. Feito para o mutirão de 17–18/10.

Testado de ponta a ponta em 16/10 contra o Supabase de produção, com conta de ensaio, em
360px: link válido → conta certa → senha gravada → home; link reusado → "Link sem
validade"; aparelho logado em outra conta + link inválido → aviso e nenhum formulário.
Prova: `npx tsx scripts/test-link-de-senha.ts` (dentro de `npm test`).

### 🔎 Busca do primeiro acesso (link de convite em massa)

`/primeiro-acesso` (e `?invite=`) acha a conta do aluno pelo nome. Até 16/10 era a maior
fonte de "e-mail ou senha inválidos" (143 recusas contra 32 entradas em 24 h). Regras em
`src/lib/primeiro-acesso.ts`; busca no banco por `contas_para_primeiro_acesso()` (migration
`20261016150000`, só `service_role`).

1. **Nome completo EXATO ou o login**, sem acento, sem diferença de maiúscula, espaços
   normalizados (`normalizar_nome()` no SQL = `normalizarNome()` no TS). Nunca pedaço do
   nome: o `ilike %nome%` com `limit 1` entregava "Pietro Gabriel de Souza" a quem digitava
   "Gabriel de Souza".
2. **Duas ou mais contas com o nome exato: a tela não escolhe** (em 16/10, 170 nomes em 341
   contas, quase sempre o mesmo aluno duplicado). Ela manda quem já tem cadastro à
   secretaria e deixa quem NÃO tem criar conta nova com e-mail diferente (`base2@`,
   `base3@`…) — decisão da coordenação. O servidor só aceita `permitirEmailDiferente`
   depois de conferir que há 2+ contas com aquele nome, e só com convite válido.
3. **A senha padrão só aparece se a conta ainda a usa** (conferido no banco com `crypt`).
   Antes ia para todo mundo, e 1 em cada 4 alunos ativos já tinha trocado. Para os outros,
   a tela diz "você já criou a sua senha" e aponta o SMS ou a secretaria. A senha padrão
   vem de `src/lib/senha-padrao.ts` (`SENHA_PADRAO_INICIAL`, com a histórica de reserva).
4. **O erro do login tem atalhos**: "Esqueci minha senha" e "Não sei meu login".

Prova: `npx tsx scripts/test-primeiro-acesso.ts` (dentro de `npm test`).

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

**Senha padrão com troca obrigatória (16/10).** `create-user` criava a conta com a senha
padrão e `must_change_password: false` — a tela da secretaria prometia "no primeiro login o
aluno será solicitado a criar uma nova senha", e isso nunca acontecia. Agora nasce com
`true`. Na base, as **1.122 contas que nunca entraram e ainda tinham a senha padrão**
ganharam a troca obrigatória — **280 delas são alunos reais**; as outras 842 eram logins
antigos sem perfil (ver "Logins órfãos" abaixo). **Ficaram de fora, de propósito, 126 contas já em uso com a
senha padrão** (122 alunos, 2 professores, 1 staff, 1 admin; 22 entraram nos últimos 30
dias): ligar a troca nelas leva quem estiver logado direto para `/dashboard/first-access`
no meio do uso, então é decisão da coordenação, de preferência avisando antes. Contagem
refeita por `crypt()` no banco, sem expor senha.

**Logins órfãos e o gatilho que cria perfil (16/10).** Existiam ~846 contas em `auth.users`
criadas entre 26/02 e 11/04, nunca usadas, sem nome em lugar nenhum e **sem perfil** (620
com login terminado em número, como `abnerjesus2@`; 438 têm um "gêmeo" com nome). Elas
ocupam o e-mail: criar o aluno com aquele login dá "já cadastrado", e não há o que achar
na busca. ⚠️ **Qualquer UPDATE em `auth.users.raw_user_meta_data` dispara
`sync_profile_display_name`, que CRIA um perfil vazio (aluno ativo, sem nome) para login
sem perfil.** Foi o que aconteceu em 16/10: o lote da troca obrigatória criou 842 perfis
vazios, que inflaram "alunos ativos" de 1.091 para 1.933 e entrariam como ausentes na
chamada de aula para todas as turmas. Foram arquivados no mesmo dia e **apagados em 16/10**
(840 logins, junto com as 300 contas e as 2 aulas do ensaio de carga), depois de conferir
que nenhum tinha dado em outra tabela. Ficaram, de propósito: 1 conta sem nome que alguém
da equipe usou em março (tem registro em `activity_logs`), 1 de `teste.com` e 4 logins sem
perfil (teste e um professor). Base depois da limpeza: 1.147 perfis, 1.092 alunos ativos.
Antes de mexer em metadado em massa, filtre `EXISTS (SELECT 1 FROM profiles WHERE id = u.id)`.

**Listas da secretaria carregam tudo (corrigido em 16/10).** Usuários (`admin/users`) e
Matrículas (`secretary/enrollments`) faziam `select('*')` sem paginar, e o PostgREST corta
em 1.000 linhas sem avisar; Gestão de Turmas (`admin/students`) tinha `.limit(500)`.
Ordenado por nome, quem vinha depois de "Sara" não aparecia, e a secretaria tentava criar
a conta de novo ("e-mail já cadastrado"). Agora as três usam `carregarTudo()`
(`src/lib/carregar-tudo.ts`, de 1.000 em 1.000, ordem `name` + `id`) e a mesma busca
`bateComBusca()` (nome, nome completo, e-mail de login e usuário, sem acento). **Toda lista
nova de alunos ou usuários precisa paginar assim.** O `create-user` diz de quem é o
e-mail quando ele já existe. Prova: `scripts/test-carregar-tudo.ts` (dentro de `npm test`).

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

Policies mortas remanescentes **sem impacto** (a de moderação de `live_messages` saiu em `20261014120000`) (feature não usada client-side ou coberta por
outra policy): `subjects`, `classes` (admin gerencia de outros),
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
LINK_SENHA_SECRET  (server-side only, 16+ caracteres — assina o link de senha de 24 h; sem ela usa PASSWORD_RESET_TOKEN_SECRET)
SENHA_PADRAO_INICIAL  (server-side only, opcional — senha inicial de contas novas; sem ela vale a histórica)
```

## 📌 Pastas Importantes

- `/src/app/dashboard`: Rotas por cargo (student/teacher/admin)
- `/src/components/ui`: Componentes base Shadcn
- `/src/lib`: `AuthProvider`, `gamification`, `constants` (escolas, matérias), `utils` (`cn()`)
- `/supabase/migrations`: Fonte da verdade do schema — ler antes de qualquer query
- `/public/templates`: Templates JSON de provas
