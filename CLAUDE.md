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
| `scheduled_lives` | id, title, teacher_id, start_time, meet_url |
| `notes` | id, user_id, title, blocks (JSONB), subject_id, tags (TEXT[]), is_pinned, updated_at, created_at |
| `user_badges` | user_id, badge_id, awarded_at |

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

### IA Extraction (Motor de Provas)
- Se o enunciado original diz "utilize o texto para responder as questões X a Y", a IA **deve** repetir o `supporting_text` integralmente em **cada** objeto de questão do JSON gerado.
- Se houver referência a imagem/gráfico, insira `[IMAGEM_PENDENTE]` no enunciado.

### Simulados & Provas
- Renderize `supporting_text` em card destacado **antes** do enunciado.
- Se `image_url` existir, exibi-la no topo do card da questão (prioridade visual).
- Siga padrão ENEM: 3,5 min/questão, navegação por grade, opção de revisão.

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
| 🟡 MÉDIO | `api/student/primeiro-acesso` (action `search`) | `search` (usada pelo fluxo de primeiro acesso) ainda devolve `userId`/`email` e permite enumeração de usuários. O reset de senha (`identify`/`confirm`) já exige prova de identidade + SMS OTP + rate limit (ver Fase 2 do plano de recuperação). **Fix:** blindar `search` para não devolver dados identificáveis. |
| 🟠 ALTO | `lib/registration-token.ts` | HMAC dos tokens de cadastro usa a própria `SUPABASE_SERVICE_ROLE_KEY` como chave. Usar segredo dedicado (`REGISTRATION_TOKEN_SECRET`). |
| 🟠 ALTO | `api/student/weekly-summary` | IDOR: lê dados de qualquer `userId` do body com service role. |
| 🟡 MÉDIO | `api/push/notify` (branch `chat`) | Usuário autenticado pode enviar push com conteúdo arbitrário a qualquer `receiverId`. |
| 🟡 MÉDIO | `api/essay-save` | Insere `essay_submissions` com `user_id`/`score` do body sem auth. |
| 🟢 BAIXO | `api/student/self-register` | Sem rate limit (spam de contas via token vazado). |

**Ação recomendada nº 1:** rotacionar a senha `'compromisso2026'` (é também a senha padrão de
novos usuários) e migrar as rotas acima para `requireAdminUser()`.

### 🔒 Auditoria de RLS + Edge Functions (2026-07-10) — aplicado em produção

Auditoria completa do banco (Supabase security advisor) + edge functions. Correções
já **aplicadas em produção** e versionadas em `/supabase/migrations` e `/supabase/functions`:

| Sev | Local | Correção |
|-----|-------|----------|
| ✅ CRÍTICO | `direct_messages` e ~30 tabelas (`profiles`, `essay_submissions`, `student_question_answers`, `material_annotations`, `simulation_attempts`, `invitations`, fóruns, lives, trilhas, materiais…) | Policies residuais de "modo demo" (`Acesso Demo`, `open_*`) com `USING/WITH CHECK true` anulavam as restritas via OR. Em `profiles` permitia escalada de privilégio (qualquer autenticado alterava o próprio `role`). **Removidas; mantidas/criadas policies por dono ou papel.** Migrations `20260710010000`/`020000`/`030000`. |
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
1. **Telefone obrigatório (gate):** transformar o card "Cadastre seu Telefone" da home num
   bloqueio igual ao `must_change_password` — sem telefone, não acessa o dashboard. Grátis,
   não depende de SMS, faz a cobertura de telefone tender a 100% com o tempo. *(Pendente)*
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
└── teacher/
    ├── questions/      # Banco de questões
    └── analytics/      # BI & analytics
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
