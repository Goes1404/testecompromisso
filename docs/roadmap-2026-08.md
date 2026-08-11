# Roadmap — agosto/2026

> Ponto de partida: **10 alunos ativos nos últimos 7 dias**, de 733 contas reais.
> Este documento é ordenado por evidência, não por preferência. Cada item cita o
> dado que o justifica.

## O que os dados dizem

| Etapa | Alunos | % da base real |
|---|---|---|
| Contas reais (1.061 − 328 do import de 14/07) | 733 | 100% |
| Já entraram alguma vez | 472 | 64% |
| Voltaram em outro dia | 373 | 51% |
| Usaram alguma ferramenta de estudo | 86 | 12% |
| **Ativos nos últimos 7 dias** | **10** | **1,4%** |

O funil não quebra na entrada — 64% chegaram a entrar. Quebra entre **voltar** e
**estudar**: 373 → 86.

### Por que a Vercel não respondeu "qual página trava mais"

Duas razões, ambas resolvíveis:

1. **Web Analytics não está habilitado no projeto.** O código já está pronto:
   `@vercel/analytics` e `@vercel/speed-insights` estão instalados e os
   componentes montados em `src/app/layout.tsx:92-93`. Falta o botão no painel
   da Vercel. Sem isso, a API responde `Web Analytics not found`.
2. **Runtime logs não medem navegação nesta aplicação.** Depois do primeiro
   carregamento, trocar de tela é navegação client-side e não gera requisição ao
   servidor. Em 7 dias de produção existem 4 linhas de log, todas 200. Isso não
   é sinal de pouco uso — é o comportamento normal de uma SPA.

O que a Vercel **entregou** foram os erros de servidor, e eles mudam a
prioridade (ver Fase 0).

---

## Fase 0 — Parar de perder aluno (esta semana)

### 0.1 · A camada de IA esteve fora do ar por 11 dias

**Evidência (Vercel, últimos 7 dias):** 429 `credit_balance_exhausted` em quatro
rotas, de 30/07 a 10/08 — `weekly-summary` (14 ocorrências, 3 alunos), `chat` da
Aurora (4, 3 alunos), `essay-theme` (2), `essay-ocr` (2). Créditos foram
recolocados em 11/08.

Enquanto isso, todo aluno que abriu o chat da Aurora, pediu o resumo semanal,
gerou tema de redação ou fotografou uma redação recebeu erro.

**O que fazer:** alerta quando a chave ficar sem crédito, e degradação honesta
em vez de erro cru — a tela precisa dizer "esta função está temporariamente
indisponível", não "erro de conexão".

### 0.2 · Redação falhou para 4 alunos sem virar registro

**Evidência:** `Nenhuma correção válida retornada pela IA` — 14 ocorrências,
**4 alunos distintos**, em `/api/essay-evaluate`, entre 11/07 e 10/08.

Isso significa que **mais alunos tentaram enviar redação do que os 5 registros do
banco mostram**. As tentativas falharam antes de gravar. Combinado com o
`CHECK (score <= 100)` já corrigido, a funcionalidade estava quebrada em duas
camadas ao mesmo tempo.

**O que fazer:** com os créditos de volta, validar o fluxo ponta a ponta com uma
redação real. O motor já tem timeout e telemetria.

### 0.3 · O aluno é derrubado para o login no meio do uso

**Evidência:** `Invalid Refresh Token: Refresh Token Not Found` — 20 ocorrências
em `/middleware`, 3 usuários, de 16/06 a 10/08.

**O que fazer:** tratar o refresh inválido no middleware limpando o cookie e
redirecionando com uma mensagem, em vez de estourar. Um aluno que é expulso sem
explicação não tenta de novo.

### 0.4 · Habilitar Web Analytics e Speed Insights

Painel da Vercel → projeto `testecompromisso` → Analytics → Enable. Sem código
novo. Depois disso, "página mais acessada", "tempo na página" e Web Vitals
passam a existir — com alguns dias de acúmulo.

### 0.5 · Desligar o cron job quebrado

**Evidência:** `cron.job` id 1 dispara `net.http_post` a cada minuto para
`https://SEU_PROJECT_REF.supabase.co/...` com a service role key literal
`SUA_SERVICE_ROLE_KEY`. São **136.312 execuções** desde maio contra um host que
não existe.

`SELECT cron.unschedule(1);`

---

## Fase 1 — Deixar o aluno entrar (semana seguinte)

### 1.1 · 366 alunos presos na troca de senha

Contas criadas com senha padrão, com `must_change_password = true`, que nunca
completaram o primeiro acesso. Destes, 273 nunca logaram.

### 1.2 · Recuperação de senha não funciona

**Evidência:** 267 tentativas, 263 falhas, 126 pessoas distintas em um mês.
Nenhum OTP chegou a ser enviado. A causa é de dados, não de código: 811 de 1.058
alunos não têm nem telefone nem data de nascimento.

**O que fazer:** Fase 3 do plano já documentado — fallback permanente pela
secretaria (reset direto ou link de recuperação), que é adequado a um cursinho
presencial onde a identidade se prova no balcão.

### 1.3 · Separar as 328 contas do import

Criadas em 14/07 pela importação de boletim, todas ETEC, 319 nunca logaram.
Não devem ser apagadas — as notas importadas pertencem a elas —, mas precisam
ser marcadas para não distorcerem toda métrica. A view `funil_alunos` já as
exclui; falta o mesmo no restante dos relatórios.

---

## Fase 2 — Ter o que fazer lá dentro

### 2.1 · Conteúdo ETEC

245 questões contra 2.607 de ENEM. **Sociologia, Filosofia e Espanhol têm zero.**
Provas com PDF: 3, contra 24 do ENEM. Metade da base é ETEC.

### 2.2 · FUVEST

18 provas cadastradas, **nenhuma com PDF**. 782 questões, **nenhuma com
micro-tópico** — ficam fora do Treino Específico.

### 2.3 · Reprocessar as redações zeradas

A do Lucas já foi recorrigida (0 → 840). Restam a da Gyovana (919 caracteres) e
a do Kelvin (125 caracteres — provavelmente anulação legítima por texto
insuficiente). O script existe: `npx tsx scripts/recorrigir-redacao.ts --id <uuid>`.

---

## Fase 3 — Ler a telemetria e agir (a partir de ~18/08)

A instrumentação entrou em 11/08 e ainda não tem dados. Com 10 alunos ativos por
semana, uma leitura confiável exige de 7 a 10 dias.

**Onde olhar:** `/dashboard/admin/uso`.

**Três hipóteses que os dados vão confirmar ou matar:**

| Evento | Se aparecer no topo, significa |
|---|---|
| `simulado_sem_questoes` | o problema é conteúdo, não produto |
| `aula_player_indisponivel` | a rede da escola bloqueia o YouTube — o conserto é hospedagem, não código |
| `material_popup_bloqueado` | o navegador do aluno impede abrir material |

Se nenhum aparecer, as três hipóteses morrem e a busca continua com dados novos.

---

## Fase 4 — Dívida de segurança (contínuo)

Já documentada em `CLAUDE.md`, sem prazo definido:

- Rotacionar a senha padrão `compromisso2026` (é também a senha de novos usuários).
- Rotacionar a `SUPABASE_SERVICE_ROLE_KEY`, exposta em texto puro durante a auditoria.
- IDOR em `/api/student/weekly-summary` — lê dados de qualquer `userId` do body.
- HMAC dos tokens de cadastro usa a própria service role key como chave.
- `search` em `/api/student/primeiro-acesso` permite enumeração de usuários.

---

## O que este roadmap não sabe

Duas coisas que nenhum dado atual responde, e que mudariam a ordem acima:

1. **Por que 373 alunos voltaram e não estudaram.** A telemetria da Fase 3 existe
   para responder isso. Até lá, as Fases 1 e 2 são apostas informadas — boas
   apostas, mas apostas.
2. **Se os alunos sabem que a plataforma existe.** O comunicado do ranking de
   29/07 alcançou 608 de 1.058 alunos por um erro de segmentação (`target_group`
   casado com `profile_type`, que tem cinco valores distintos em produção). Não
   há registro de como as credenciais foram distribuídas. Uma conversa com a
   secretaria provavelmente vale mais que uma semana de código.
