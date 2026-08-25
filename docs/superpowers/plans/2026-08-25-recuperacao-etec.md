# Recuperação da Trilha ETEC — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reverter o abandono dos alunos ETEC (63% da base, 96% com 0 XP, 3 simulados nos últimos 30 dias) atacando as quatro causas validadas no diagnóstico de 25/08: questão do dia morta, banco de questões raso, trilhas invisíveis e ausência de valor específico para quem presta o Vestibulinho.

**Architecture:** Quatro frentes independentes, ordenadas por custo/benefício. Frente 1 troca agendamento manual da questão do dia por função SQL self-healing (RPC idempotente chamada pelo próprio app — sem cron, sem painel novo). Frente 2 abre as trilhas existentes para todos. Frente 3 importa as edições do Vestibulinho que faltam pelo pipeline já existente e limpa duplicatas. Frente 4 é feature nova: mapa interativo das ETECs com foto, rota e cursos.

**Tech Stack:** Next.js 15 (App Router), Supabase (migrations + RPC), pipeline `fetch-etec-pdfs.sh` + `import-etec.ts` existente, Leaflet + react-leaflet (novo, Frente 4), Google Street View Static API (foto, opcional/chaveado).

**Spec:** Este documento é o roadmap e a spec. Diagnóstico que o fundamenta: sessão de 25/08/2026 — dados de produção citados na seção "Contexto validado".

## Contexto validado (produção, 25/08/2026)

- 635 alunos ETEC vs 365 ENEM. XP médio 14 vs 63. 96% dos ETEC com 0 XP.
- Últimos 30 dias: 3 exam_attempts ETEC vs 18 ENEM; 288 respostas (27 alunos) vs 3.574 (65).
- Histórico: 448 alunos ETEC já fizeram simulado — experimentaram e abandonaram.
- Questões: 587 ETEC vs 3.389 ENEM. Trilhas ETEC: zero (15 `enem`, 55 `all`).
- Questão do dia ETEC: 10 agendadas na mão, última em 14/07. Nenhum agendador existe.
- Provas ETEC no banco: 2015-1 a 2025-1 (17 edições) **+ 3 duplicatas** com título
  "ETEC 2023 - 1º Semestre" / "ETEC 2023 - 2º Semestre" / "ETEC 2024 - 1º Semestre"
  (mesmas edições de "ETEC 2023-1/2023-2/2024-1").
- Edições que faltam e TÊM prova: **2025-2, 2026-1, 2026-2**. (2020-2, 2021-1, 2021-2 e
  2022-1 não tiveram prova — seleção por análise de histórico na pandemia. Não procurar.)

## Global Constraints

- Plataforma **em produção** — toda migration via arquivo em `/supabase/migrations` + `npx supabase db push`; nunca SQL direto sem versionar.
- RLS: papel via `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role ...)`; **nunca** `auth.jwt()->>'user_role'` (claim é sempre null — ver CLAUDE.md).
- Público do aluno: regra canônica é `lower(exam_target) LIKE '%etec%' → etec, resto → enem` (espelha `allowedExamTypesFor` e `ranking_track`).
- Datas do "dia": cliente usa `new Date().toISOString().slice(0,10)` = data **UTC**. Server deve usar `CURRENT_DATE` (UTC) para casar. Não introduzir timezone local.
- Libs client-side que tocam `window` (Leaflet): `dynamic(..., { ssr: false })`.
- Feedback de erro/sucesso: hook `useToast`.
- Cards `rounded-[2.5rem]` + `shadow-2xl`, títulos `font-black italic`, mobile-first.
- Nunca commitar chave/segredo; chaves novas entram em `.env.local` + documentadas no CLAUDE.md.

## Ordem de execução e dependências

| Fase | Frente | Esforço | Depende de |
|---|---|---|---|
| 1 (hoje) | F1 Questão do dia self-healing | ~2h | nada |
| 1 (hoje) | F2 Trilhas → `all` | ~15min | nada |
| 2 (semana) | F3a Auditoria/limpeza de provas duplicadas | ~1h | nada |
| 2 (semana) | F3b Import 2025-2, 2026-1, 2026-2 | ~2h + revisão | ids do S3 (passo manual no navegador) |
| 3 (próx. semanas) | F4 Mapa das ETECs (MVP região) | ~2-3 dias | dataset curado; chave Google p/ foto |
| 3+ | F4b Mapa estado inteiro + foto | ~1-2 dias | F4 no ar |

Métrica de sucesso (re-rodar diagnóstico em 30 dias): exam_attempts ETEC 30d ≥ 30; alunos ETEC respondendo questões ≥ 80; % ETEC com 0 XP < 85%.

---

## Frente 1 — Questão do dia ETEC self-healing

Problema: `daily_questions` só tem linhas inseridas na mão; sem linha do dia, o card
some (`state === 'empty'` → `return null`) e a página diz "professor ainda não agendou".
Solução: RPC `ensure_daily_question(p_audience)` idempotente — o primeiro aluno do dia
que abrir o app cria a linha. Sem cron, sem painel, funciona para os dois públicos.

### Task 1.1: Migration da função `ensure_daily_question`

**Files:**
- Create: `supabase/migrations/20260825100000_ensure_daily_question.sql`

**Interfaces:**
- Produces: RPC `public.ensure_daily_question(p_audience TEXT) RETURNS uuid` — devolve o id da linha de `daily_questions` de hoje para o público (criando se preciso); `NULL` se não há questão elegível. Executável por `authenticated`.

- [ ] **Step 1: Escrever a migration**

```sql
-- Questão do dia self-healing.
--
-- Não existe agendador: as 40 linhas de daily_questions foram inseridas na mão
-- e acabaram (ETEC parada desde 14/07, ENEM desde 03/08). Em vez de criar um
-- painel ou um cron, o próprio app garante a linha do dia: o primeiro aluno que
-- abrir o dashboard chama esta função, que é idempotente (UNIQUE em
-- (target_audience, scheduled_date) já existe desde 20260706000000).
--
-- CURRENT_DATE é UTC de propósito: o cliente calcula "hoje" com
-- toISOString().slice(0,10), que também é UTC. Mudar um dos lados para
-- horário de Brasília quebraria a virada do dia entre 21h e 0h.

CREATE OR REPLACE FUNCTION public.ensure_daily_question(p_audience TEXT)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_aud      TEXT := CASE WHEN lower(coalesce(p_audience, '')) LIKE '%etec%'
                          THEN 'etec' ELSE 'enem' END;
  v_id       uuid;
  v_question uuid;
BEGIN
  SELECT id INTO v_id FROM daily_questions
   WHERE target_audience = v_aud AND scheduled_date = CURRENT_DATE;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- Elegível: do público (ou 'all'), sem imagem (a tela do desafio não renderiza
  -- image_url), com gabarito, e nunca usada como questão do dia deste público.
  SELECT q.id INTO v_question
    FROM questions q
   WHERE q.target_audience IN (v_aud, 'all')
     AND q.image_url IS NULL
     AND q.question_text NOT LIKE '%[IMAGEM_PENDENTE]%'
     AND q.correct_answer IS NOT NULL
     AND jsonb_typeof(q.options) = 'array'
     AND jsonb_array_length(q.options) >= 4
     AND NOT EXISTS (SELECT 1 FROM daily_questions dq
                      WHERE dq.question_id = q.id
                        AND dq.target_audience = v_aud)
   ORDER BY random()
   LIMIT 1;

  -- Pool esgotado (todas já foram usadas um dia): libera repetir o que não
  -- aparece há mais de 120 dias, em vez de deixar o dia sem questão.
  IF v_question IS NULL THEN
    SELECT q.id INTO v_question
      FROM questions q
     WHERE q.target_audience IN (v_aud, 'all')
       AND q.image_url IS NULL
       AND q.question_text NOT LIKE '%[IMAGEM_PENDENTE]%'
       AND q.correct_answer IS NOT NULL
       AND jsonb_typeof(q.options) = 'array'
       AND jsonb_array_length(q.options) >= 4
       AND NOT EXISTS (SELECT 1 FROM daily_questions dq
                        WHERE dq.question_id = q.id
                          AND dq.target_audience = v_aud
                          AND dq.scheduled_date > CURRENT_DATE - 120)
     ORDER BY random()
     LIMIT 1;
  END IF;

  IF v_question IS NULL THEN RETURN NULL; END IF;

  -- ON CONFLICT cobre a corrida de dois alunos abrindo o app no mesmo segundo.
  INSERT INTO daily_questions (question_id, target_audience, scheduled_date)
  VALUES (v_question, v_aud, CURRENT_DATE)
  ON CONFLICT (target_audience, scheduled_date) DO NOTHING;

  SELECT id INTO v_id FROM daily_questions
   WHERE target_audience = v_aud AND scheduled_date = CURRENT_DATE;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.ensure_daily_question(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_daily_question(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_daily_question(TEXT) TO service_role;

COMMENT ON FUNCTION public.ensure_daily_question(TEXT) IS
  'Garante a questao do dia do publico (etec/enem), criando se faltar. Idempotente; chamada pelo app.';
```

Atenção antes de aplicar: conferir na migration `20260706000000_create_gamification.sql`
se `daily_questions.question_id` é `NOT NULL` e se o UNIQUE é exatamente
`(target_audience, scheduled_date)` — o `ON CONFLICT` depende disso. Conferir também
o tipo de `questions.options`: se for `TEXT` e não `JSONB`, trocar os dois guards por
`q.options IS NOT NULL`.

- [ ] **Step 2: Aplicar em produção**

Run: `npx supabase db push`
Expected: migration aplicada sem erro.

- [ ] **Step 3: Testar a função direto no banco (via script, service role)**

Criar `scripts/_tmp-teste-daily.ts` (descartável) que chama
`db.rpc('ensure_daily_question', { p_audience: 'etec' })` duas vezes e imprime os dois
retornos + a linha criada:

```ts
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } });
async function main() {
  const a = await db.rpc('ensure_daily_question', { p_audience: 'etec' });
  const b = await db.rpc('ensure_daily_question', { p_audience: 'etec' });
  console.log('1ª chamada:', a.data, a.error?.message ?? '');
  console.log('2ª chamada (deve devolver o MESMO id):', b.data, b.error?.message ?? '');
  const { data } = await db.from('daily_questions').select('id, question_id, scheduled_date, target_audience')
    .eq('target_audience', 'etec').order('scheduled_date', { ascending: false }).limit(1);
  console.log('linha de hoje:', data);
}
main();
```

Run: `npx tsx scripts/_tmp-teste-daily.ts`
Expected: dois uuids iguais, linha com `scheduled_date` de hoje. Depois: apagar o script e a linha de teste **não** — ela É a questão de hoje, deixar.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260825100000_ensure_daily_question.sql
git commit -m "questao do dia: agendamento self-healing via ensure_daily_question()"
```

### Task 1.2: App chama a RPC quando não há questão do dia

**Files:**
- Create: `src/lib/daily.ts`
- Modify: `src/app/dashboard/student/daily/page.tsx` (bloco `if (!dq)`, ~linha 114)
- Modify: `src/components/DailyQuestionCard.tsx` (bloco `if (!dq)`, ~linha 34)

**Interfaces:**
- Consumes: RPC `ensure_daily_question(p_audience)` da Task 1.1.
- Produces: `garantirQuestaoDoDia(supabase, audience: 'etec' | 'enem'): Promise<boolean>` — true se depois da chamada existe questão de hoje.

- [ ] **Step 1: Criar o helper**

```ts
// src/lib/daily.ts
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Garante que a questão do dia do público existe. O agendamento é self-healing:
 * não há cron nem painel — o primeiro aluno do dia dispara a criação no servidor
 * (RPC idempotente). Devolve true se há questão para hoje após a chamada.
 */
export async function garantirQuestaoDoDia(
  supabase: SupabaseClient,
  audience: 'etec' | 'enem',
): Promise<boolean> {
  const { data, error } = await supabase.rpc('ensure_daily_question', { p_audience: audience });
  if (error) return false;
  return data !== null;
}
```

- [ ] **Step 2: Usar na página do desafio**

Em `daily/page.tsx`, dentro de `fetchDaily`, substituir o retorno vazio:

```ts
if (!dq) {
  // Sem linha de hoje: pede ao servidor para criar (self-healing) e tenta 1x de novo.
  const criou = await garantirQuestaoDoDia(supabase, audience);
  if (criou) {
    const retry = await supabase
      .from('daily_questions')
      .select(`id, scheduled_date, question_id,
        questions ( id, question_text, options, correct_answer, explanation, subjects ( name ) )`)
      .eq('target_audience', audience)
      .eq('scheduled_date', today)
      .maybeSingle();
    if (retry.data) { dq = retry.data; }
  }
  if (!dq) { setDaily(null); setLoading(false); return; }
}
```

(`dq` vira `let` na desestruturação: `let { data: dq, error: dqErr } = ...`.)

- [ ] **Step 3: Usar no card da home**

Em `DailyQuestionCard.tsx`, mesmo padrão no lugar de `if (!dq) { setState('empty'); return; }`:

```ts
if (!dq) {
  const criou = await garantirQuestaoDoDia(supabase, audience);
  if (criou) {
    const retry = await supabase
      .from('daily_questions')
      .select('id, questions(subjects(name))')
      .eq('target_audience', audience)
      .eq('scheduled_date', today)
      .maybeSingle();
    if (retry.data) { dq = retry.data; }
  }
  if (!dq) { setState('empty'); return; }
}
```

- [ ] **Step 4: Verificar tipos e build**

Run: `npm run typecheck`
Expected: sem erros novos.

- [ ] **Step 5: Testar no navegador**

Run: `npm run dev` → logar com conta de aluno ETEC (ou conta demo com `exam_target` contendo "etec") → home deve mostrar o card "Desafio do Dia"; `/dashboard/student/daily` deve carregar questão, nunca "professor ainda não agendou".

- [ ] **Step 6: Commit**

```bash
git add src/lib/daily.ts src/app/dashboard/student/daily/page.tsx src/components/DailyQuestionCard.tsx
git commit -m "questao do dia: app cria a linha do dia quando falta (ETEC voltou a ter desafio)"
```

---

## Frente 2 — Trilhas visíveis para ETEC (`target_audience = 'all'`)

Decisão de produto (25/08): não criar trilhas ETEC agora; abrir as 16 trilhas `enem`
para todos. O filtro do aluno (`src/app/dashboard/trails/page.tsx:204-207`) já mostra
`'all'` para qualquer público — basta o UPDATE.

### Task 2.1: Migration

**Files:**
- Create: `supabase/migrations/20260825110000_trails_para_todos.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Alunos ETEC (63% da base) não viam nenhuma trilha exclusiva: 16 trilhas eram
-- 'enem' e zero eram 'etec'. Decisão de produto de 25/08: abrir as trilhas
-- existentes para todos em vez de duplicar conteúdo por público. O filtro do
-- app já exibe 'all' para qualquer trilha de aluno.
UPDATE trails SET target_audience = 'all' WHERE target_audience = 'enem';
```

- [ ] **Step 2: Aplicar e conferir**

Run: `npx supabase db push`
Depois conferir com script descartável (ou pelo painel): `SELECT target_audience, count(*) FROM trails GROUP BY 1` → esperado: só `all` (71).

- [ ] **Step 3: Testar como aluno ETEC**

`npm run dev` → aluno ETEC → `/dashboard/trails` deve listar as trilhas que antes eram só ENEM.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260825110000_trails_para_todos.sql
git commit -m "trilhas: abre as trilhas enem para todos os publicos"
```

Ressalva registrada: se alguma trilha for de redação ENEM pura, ela vai aparecer para
ETEC (vestibulinho não tem redação). Aceito por ora; se incomodar, voltar essa trilha
específica para 'enem' numa migration futura.

---

## Frente 3 — Banco de questões ETEC: limpar duplicatas e importar o que falta

### Task 3.1: Auditoria das provas duplicadas

Três títulos duplicados no banco: "ETEC 2023 - 1º Semestre"/"ETEC 2023-1",
"ETEC 2023 - 2º Semestre"/"ETEC 2023-2", "ETEC 2024 - 1º Semestre"/"ETEC 2024-1".
Cada import cria questões novas — as duplicatas provavelmente inflam as 587 questões
ETEC com clones. **Auditar antes de apagar qualquer coisa.**

**Files:**
- Create: `scripts/auditoria-provas-etec.ts` (permanente — serve de relatório)

- [ ] **Step 1: Escrever o script de auditoria (só leitura)**

```ts
/**
 * Relatório das provas ETEC: questões e tentativas por prova, para decidir a
 * limpeza das duplicatas de 2023-1/2023-2/2024-1 (importadas duas vezes com
 * títulos diferentes). NÃO altera nada.
 *
 * Uso: npx tsx scripts/auditoria-provas-etec.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data: exams, error } = await db.from('exams').select('id, title, year').eq('exam_type', 'etec').order('year');
  if (error) throw error;
  for (const ex of exams ?? []) {
    const { count: qs } = await db.from('exam_questions').select('*', { count: 'exact', head: true }).eq('exam_id', ex.id);
    const { count: tent } = await db.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('exam_id', ex.id);
    console.log(`${ex.year} | ${ex.title} | ${qs} questões | ${tent} tentativas | ${ex.id}`);
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
```

- [ ] **Step 2: Rodar e decidir**

Run: `npx tsx scripts/auditoria-provas-etec.ts`
Regra de decisão: para cada par duplicado, **sobrevive a prova com tentativas**; se as
duas têm tentativas, sobrevivem as duas (apagar histórico de aluno não é opção — mesma
lógica das contas duplicadas, ver CLAUDE.md). Se uma tem 0 tentativas: apagar
`exam_questions` dela, as `questions` exclusivas dela (que não estão em nenhuma outra
prova E sem resposta em `student_question_answers`), e por fim o `exam`.

- [ ] **Step 3: Escrever a limpeza como script com `--dry` default**

Só depois da auditoria, no mesmo padrão do repo (`--dry` sem flag, `--aplicar` para
escrever). Conferir contagem de `student_question_answers` por questão antes de cada
DELETE. Commit da auditoria junto.

```bash
git add scripts/auditoria-provas-etec.ts
git commit -m "provas etec: auditoria de duplicatas (2023-1, 2023-2, 2024-1)"
```

### Task 3.2: Importar Vestibulinho 2025-2, 2026-1 e 2026-2

**Files:**
- Modify: `scripts/fetch-etec-pdfs.sh` (MANIFEST, linhas 30-48)

**Passo manual (bloqueante, ~10 min, precisa de navegador):** o site
`vestibulinho.etec.sp.gov.br/provas-gabaritos` responde 403 para datacenter mas abre
em máquina doméstica. Abrir no navegador, localizar as edições 2025-2, 2026-1 e
2026-2, copiar dos links dos PDFs o **id numérico** do caminho
`fatweb.s3.amazonaws.com/vestibulinhoetec/gabarito/<ID>/<arquivo>.pdf` e o nome exato
dos arquivos de prova e gabarito.

- [ ] **Step 1: Acrescentar as linhas ao MANIFEST**

Formato (uma linha por edição, no topo da lista):

```bash
2026-2|<id-copiado-do-navegador>|Prova.pdf|Gabarito.pdf
2026-1|<id-copiado-do-navegador>|Prova.pdf|Gabarito.pdf
2025-2|<id-copiado-do-navegador>|Prova.pdf|Gabarito.pdf
```

(Se o gabarito tiver sido retificado, o arquivo chama `Gabarito-retificado.pdf` — usar o retificado, como já feito em 2024-2.)

- [ ] **Step 2: Baixar e extrair**

Run: `bash scripts/fetch-etec-pdfs.sh 2025-2 2026-1 2026-2`
Expected: `✔` para as três edições. Se `⚠️ download falhou`, o id está errado — reconferir no navegador.

- [ ] **Step 3: Preview do import (não escreve)**

Run: `npm run import:etec -- --dry --only 2025-2,2026-1,2026-2`
Expected: ~50 questões por prova, matérias distribuídas (conferir se Matemática não virou Geografia — ver `ETEC_CLASSIFY_GUIDANCE` no import).

- [ ] **Step 4: Importar de verdade**

Run: `npm run import:etec -- --only 2025-2,2026-1,2026-2`
Expected: 3 exams novos + questões com `target_audience='etec'`.

- [ ] **Step 5: Conferir no app e commitar**

`npm run dev` → aluno ETEC → `/dashboard/student/simulados` deve listar as três provas novas.

```bash
git add scripts/fetch-etec-pdfs.sh
git commit -m "vestibulinho: manifesto ganha 2025-2, 2026-1 e 2026-2"
```

Nota de expectativa: +3 provas ≈ +150 questões (587 → ~740). Ainda longe das 3.389 do
ENEM — o funil de longo prazo é gerar questões inéditas estilo vestibulinho (fora deste
plano; registrar como ideia futura).

---

## Frente 4 — Mapa das ETECs

Feature nova: aluno abre um mapa com todas as ETECs; clica numa unidade e vê foto,
botão "Como chegar" e os cursos que ela oferece. Objetivo de produto: dar ao aluno
ETEC um valor que só existe para ele — escolher a escola é parte da jornada do
vestibulinho.

**Decisões de arquitetura (fechadas neste roadmap):**

1. **Mapa: Leaflet + OpenStreetMap** (`leaflet` + `react-leaflet`), não Google Maps JS.
   Grátis, sem chave, ~45 KB, roda bem em celular de rede móvel (mesma filosofia do
   mascote sem three.js). `dynamic(..., { ssr: false })` obrigatório.
2. **"Como chegar": URL universal do Google Maps** — `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` — abre o app do Google Maps no celular, **sem chave de API**.
3. **Foto "do Google": Street View Static API** — `https://maps.googleapis.com/maps/api/streetview?size=640x360&location=<lat>,<lng>&key=...`. Exige `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (criar no Google Cloud, restringir por referrer, billing ativo — fica no free tier nesse volume). **Sem a chave, o painel mostra placeholder** com o nome da unidade — o resto do feature funciona. A chave é pré-requisito externo, não bloqueia o MVP.
4. **Dados: arquivo estático curado** `src/data/etecs.json`, gerado por script e
   revisado à mão. Nada de tabela no banco: a lista de ETECs muda ~1x/ano, e arquivo
   estático significa zero RLS, zero query, cache do CDN. Fonte: site do Centro Paula
   Souza (lista de unidades) + página do Vestibulinho (cursos por unidade).
   Geocodificação via Nominatim (OSM, grátis, 1 req/s).
5. **Escopo em duas etapas:** MVP com as ETECs da região dos alunos (Santana de
   Parnaíba, Barueri, Carapicuíba, Osasco, Jandira, Itapevi, Cotia, Cajamar,
   Pirituba/zona oeste — ~15-25 unidades, curadas à mão com qualidade), depois o
   estado inteiro (~228) via script.

**Estrutura de arquivos:**

| Arquivo | Papel |
|---|---|
| `src/data/etecs.json` | Dataset: código, nome, município, endereço, lat/lng, cursos[] |
| `scripts/gerar-etecs-dataset.ts` | Coleta/geocodifica (etapa 2, estado inteiro) |
| `src/app/dashboard/student/etecs/page.tsx` | Rota; carrega o mapa com `dynamic` ssr:false |
| `src/components/etecs/MapaEtecs.tsx` | Leaflet: tiles OSM, markers, seleção |
| `src/components/etecs/EtecDetalhe.tsx` | Painel/bottom-sheet: foto, como chegar, cursos |

### Task 4.1: Dataset MVP (região)

**Files:**
- Create: `src/data/etecs.json`

**Interfaces:**
- Produces: tipo `Etec = { codigo: string; nome: string; municipio: string; endereco: string; lat: number; lng: number; cursos: string[] }` — array em JSON. Tasks 4.2-4.4 consomem exatamente estes campos.

- [ ] **Step 1: Curar as unidades da região**

Fontes (abrir no navegador): `cps.sp.gov.br` → "Unidades ETEC" filtrando os municípios
da região; cursos por unidade na página da própria ETEC ou no portal do Vestibulinho.
Coordenadas: buscar o endereço no OpenStreetMap/Google Maps e copiar lat/lng.
Formato de cada entrada:

```json
{
  "codigo": "etec-de-barueri",
  "nome": "Etec de Barueri",
  "municipio": "Barueri",
  "endereco": "R. Mimas, 121 - Jardim dos Camargos, Barueri - SP",
  "lat": -23.5057,
  "lng": -46.8764,
  "cursos": ["Ensino Médio", "Ensino Médio com Habilitação Técnica", "Administração", "Desenvolvimento de Sistemas"]
}
```

Mínimo do MVP: todas as unidades de Santana de Parnaíba, Barueri, Carapicuíba, Osasco,
Jandira, Itapevi, Cotia, Cajamar e as da zona oeste da capital que os alunos prestam.
Validar cada lat/lng abrindo `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`.

- [ ] **Step 2: Commit**

```bash
git add src/data/etecs.json
git commit -m "etecs: dataset curado da regiao (mvp do mapa)"
```

### Task 4.2: Componente do mapa (Leaflet)

**Files:**
- Create: `src/components/etecs/MapaEtecs.tsx`
- Modify: `package.json` (deps novas)

**Interfaces:**
- Consumes: `Etec[]` de `src/data/etecs.json`.
- Produces: `<MapaEtecs etecs={Etec[]} selecionada={string | null} onSelecionar={(codigo: string) => void} />` — client component, exporta default (necessário para `dynamic`).

- [ ] **Step 1: Instalar dependências**

Run: `npm install leaflet react-leaflet && npm install -D @types/leaflet`

- [ ] **Step 2: Escrever o componente**

```tsx
'use client';

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import type { Etec } from '@/components/etecs/tipos';

// Os PNGs default do Leaflet quebram no bundler do Next; um divIcon em CSS puro
// evita asset externo e ainda deixa o marker com a cara da plataforma.
const icone = (ativa: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${ativa ? 22 : 16}px;height:${ativa ? 22 : 16}px;border-radius:9999px;
      background:${ativa ? '#f59e0b' : '#7c3aed'};border:3px solid white;
      box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [ativa ? 22 : 16, ativa ? 22 : 16],
    iconAnchor: [ativa ? 11 : 8, ativa ? 11 : 8],
  });

function VoarPara({ etec }: { etec: Etec | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (etec) map.flyTo([etec.lat, etec.lng], 14, { duration: 0.6 });
  }, [etec, map]);
  return null;
}

export default function MapaEtecs({ etecs, selecionada, onSelecionar }: {
  etecs: Etec[];
  selecionada: string | null;
  onSelecionar: (codigo: string) => void;
}) {
  const ativa = etecs.find((e) => e.codigo === selecionada);
  return (
    <MapContainer
      center={[-23.47, -46.85]}
      zoom={11}
      className="h-full w-full rounded-[2.5rem]"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {etecs.map((e) => (
        <Marker
          key={e.codigo}
          position={[e.lat, e.lng]}
          icon={icone(e.codigo === selecionada)}
          eventHandlers={{ click: () => onSelecionar(e.codigo) }}
        />
      ))}
      <VoarPara etec={ativa} />
    </MapContainer>
  );
}
```

E o tipo compartilhado em `src/components/etecs/tipos.ts`:

```ts
export type Etec = {
  codigo: string;
  nome: string;
  municipio: string;
  endereco: string;
  lat: number;
  lng: number;
  cursos: string[];
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/etecs/MapaEtecs.tsx src/components/etecs/tipos.ts package.json package-lock.json
git commit -m "etecs: mapa leaflet com markers das unidades"
```

### Task 4.3: Painel de detalhe (foto, como chegar, cursos)

**Files:**
- Create: `src/components/etecs/EtecDetalhe.tsx`

**Interfaces:**
- Consumes: `Etec` (tipos.ts).
- Produces: `<EtecDetalhe etec={Etec} onFechar={() => void} />` — client component; bottom sheet no mobile, painel lateral no desktop.

- [ ] **Step 1: Escrever o componente**

```tsx
'use client';

import { useState } from 'react';
import { MapPin, Navigation, GraduationCap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Etec } from '@/components/etecs/tipos';

const CHAVE_MAPS = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** Foto da fachada via Street View Static. Sem chave configurada, placeholder. */
function fotoUrl(e: Etec): string | null {
  if (!CHAVE_MAPS) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=640x360&location=${e.lat},${e.lng}&fov=80&key=${CHAVE_MAPS}`;
}

/** URL universal de rotas do Google Maps — abre o app no celular, sem chave. */
function comoChegarUrl(e: Etec): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}&destination_place_id=&travelmode=transit`;
}

export function EtecDetalhe({ etec, onFechar }: { etec: Etec; onFechar: () => void }) {
  const [fotoQuebrou, setFotoQuebrou] = useState(false);
  const foto = fotoUrl(etec);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] md:absolute md:inset-y-0 md:right-0 md:w-96 md:bottom-auto">
      <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden md:m-4 max-h-[70vh] md:max-h-full overflow-y-auto">
        {/* Foto */}
        <div className="relative h-40 bg-gradient-to-br from-violet-600 to-indigo-700">
          {foto && !fotoQuebrou ? (
            // eslint-disable-next-line @next/next/no-img-element -- host externo dinâmico, sem otimização do Next
            <img src={foto} alt={`Fachada da ${etec.nome}`} className="h-full w-full object-cover"
                 onError={() => setFotoQuebrou(true)} />
          ) : (
            <div className="h-full flex items-center justify-center text-white/80">
              <GraduationCap className="h-12 w-12" />
            </div>
          )}
          <button onClick={onFechar} aria-label="Fechar"
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-black italic leading-tight">{etec.nome}</h2>
            <p className="text-xs text-muted-foreground font-medium mt-1 flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {etec.endereco}
            </p>
          </div>

          <Button asChild className="w-full rounded-2xl font-black text-xs uppercase tracking-wider">
            <a href={comoChegarUrl(etec)} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-4 w-4 mr-2" /> Como chegar
            </a>
          </Button>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Cursos oferecidos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {etec.cursos.map((c) => (
                <span key={c} className="text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-3 py-1">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck`

```bash
git add src/components/etecs/EtecDetalhe.tsx
git commit -m "etecs: painel de detalhe com foto, rota e cursos"
```

### Task 4.4: Página e navegação

**Files:**
- Create: `src/app/dashboard/student/etecs/page.tsx`
- Modify: componente de navegação do dashboard (localizar com `grep -r "student/simulados" src/app/dashboard --include="*.tsx" -l` — acrescentar o item "Mapa das ETECs" ao lado dos links de aluno, **visível apenas quando `allowedExamTypesFor(...)` devolve `['etec']`**)

**Interfaces:**
- Consumes: `MapaEtecs` (Task 4.2), `EtecDetalhe` (Task 4.3), `src/data/etecs.json` (Task 4.1).

- [ ] **Step 1: Escrever a página**

```tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import etecsData from '@/data/etecs.json';
import { EtecDetalhe } from '@/components/etecs/EtecDetalhe';
import type { Etec } from '@/components/etecs/tipos';
import { School } from 'lucide-react';

// Leaflet toca window: nunca renderizar no servidor (regra do projeto p/ libs assim).
const MapaEtecs = dynamic(() => import('@/components/etecs/MapaEtecs'), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-[2.5rem] bg-muted/20 animate-pulse" />,
});

const etecs = etecsData as Etec[];

export default function EtecsPage() {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const ativa = etecs.find((e) => e.codigo === selecionada) ?? null;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24 space-y-4">
      <section className="aurora-dark rounded-[2.5rem] p-6 text-white shadow-2xl">
        <span className="text-[9px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-300 px-3 py-1 rounded-full border border-violet-500/30">
          <School className="inline h-2.5 w-2.5 mr-1" /> Vestibulinho
        </span>
        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter mt-2">
          Mapa das <span className="text-gradient-brand">ETECs</span>
        </h1>
        <p className="text-white/50 text-xs mt-1">
          Toque numa unidade para ver a foto, os cursos e como chegar.
        </p>
      </section>

      <div className="relative h-[65vh] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100">
        <MapaEtecs etecs={etecs} selecionada={selecionada} onSelecionar={setSelecionada} />
        {ativa && <EtecDetalhe etec={ativa} onFechar={() => setSelecionada(null)} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Acrescentar à navegação (só para aluno ETEC)**

No componente de sidebar/nav encontrado pelo grep, ao lado dos itens de aluno, item novo
condicionado ao público: rótulo "Mapa das ETECs", href `/dashboard/student/etecs`,
ícone `School` (Lucide), exibido quando `allowedExamTypesFor(profile?.exam_target).includes('etec')`.
Seguir o formato exato dos itens vizinhos do arquivo (não inventar estrutura nova).

- [ ] **Step 3: Testar mobile + desktop**

`npm run dev` → aluno ETEC → mapa carrega, marker vira laranja ao tocar, painel sobe
como bottom sheet no mobile (DevTools, viewport 390px), botão "Como chegar" abre o
Google Maps em aba nova, cursos listados. Sem `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`,
placeholder roxo com ícone no lugar da foto — sem erro no console.

- [ ] **Step 4: Build de produção + commit**

Run: `npm run build`
Expected: sem erro; rota `/dashboard/student/etecs` no output.

```bash
git add src/app/dashboard/student/etecs/page.tsx <arquivo-da-nav>
git commit -m "etecs: mapa das unidades com foto, rota e cursos por escola"
```

### Task 4.5 (etapa 2, depois do MVP no ar): estado inteiro + chave da foto

- [ ] **Step 1:** Criar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` no Google Cloud (Street View Static API, restrição por referrer aos domínios da plataforma), adicionar em `.env.local` + Vercel + seção de env vars do CLAUDE.md. **Passo manual do time — precisa de billing.**
- [ ] **Step 2:** Escrever `scripts/gerar-etecs-dataset.ts`: baixa a lista completa de unidades do site do CPS, extrai nome/endereço/cursos, geocodifica via Nominatim (`https://nominatim.openstreetmap.org/search?format=json&q=<endereco>` com 1 req/s e `User-Agent` identificado), grava `src/data/etecs.json` preservando entradas curadas à mão (merge por `codigo`, manual vence). Rodar com `--dry` primeiro; revisar diff do JSON no PR.
- [ ] **Step 3:** Com ~228 markers, avaliar clustering (`leaflet.markercluster`) — só adicionar se o mapa ficar poluído no zoom estadual; para ~228 pontos, provavelmente dispensável.

---

## Fora de escopo (registrado, não planejado)

- Gerar questões inéditas estilo vestibulinho com IA (funil de longo prazo do banco ETEC).
- Trilhas específicas ETEC (decisão de 25/08: abrir as existentes como `all` resolve por ora).
- Redação para ETEC — vestibulinho não tem redação; nada a fazer.
- Pesquisa qualitativa com alunos ETEC (recomendada em paralelo; não é tarefa de código).

## Self-Review (feito em 25/08)

- Cobertura: 4 pedidos do usuário → F1 (questão do dia), F2 (trilhas all), F3 (importar questões/simulados que faltam), F4 (mapa com foto + como chegar + cursos). ✓
- Sem placeholders de código; os únicos itens "a preencher" são dados externos genuínos (ids do S3, chave do Google, dataset curado) — cada um com o procedimento manual descrito. ✓
- Tipos consistentes: `Etec` definido em `tipos.ts` e consumido por 4.2/4.3/4.4 com os mesmos campos do JSON de 4.1; `garantirQuestaoDoDia` consome a RPC de 1.1 com o mesmo nome/parâmetro. ✓
- Riscos apontados no próprio texto: UNIQUE/`options` a conferir antes do push (1.1), duplicatas só removidas após auditoria com regra de sobrevivência (3.1), foto degradando para placeholder sem chave (4.3).
