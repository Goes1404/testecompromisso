# Roadmap — Esqueci Minha Senha via SMS OTP

Handoff pra continuar em outro agente (Antigravity). Estado em: 2026-07-09.

## Onde está o trabalho

- **Worktree isolado:** `.claude/worktrees/forgot-password-sms-otp` (branch `worktree-forgot-password-sms-otp`), NÃO em `main`.
- **Não commitado no remoto** — spec, plano e código só existem localmente até agora. Precisa `git push` quando estiver pronto (ver seção "Como continuar" abaixo).
- **Spec:** `docs/superpowers/specs/2026-07-08-forgot-password-sms-otp-design.md`
- **Plano com as 6 tasks:** `docs/superpowers/plans/2026-07-08-forgot-password-sms-otp.md`
- **Ledger de progresso (source of truth do que já rodou):** `.superpowers/sdd/progress.md`

## Progresso (Subagent-Driven Development, 1 subagent implementador + 1 revisor por task)

| Task | Status | Commits | Observação |
|---|---|---|---|
| 1. Migration `password_reset_otps` | ✅ Aprovado | `a3cdfc9..15e199e` | SQL criado, **NÃO aplicado** (`npx supabase db push` não rodou — CLI sem login neste ambiente) |
| 2. `src/lib/password-reset-token.ts` (HMAC token) | ✅ Aprovado | `15e199e..9df351d` | Incluiu fix de segurança: comparação de assinatura virou constant-time (`crypto.timingSafeEqual`) após scanner automático pegar timing attack |
| 3. `src/lib/sms.ts` (wrapper Twilio) | ✅ Aprovado | `9df351d..412b287` | `twilio` instalado via npm. Achado menor não-bloqueante: normalização de telefone pode colidir com DDD 55 (RS) — baixo risco pra escola em SP |
| 4. Rota `api/student/primeiro-acesso` (4 ações novas) | ✅ Aprovado | `412b287..18e4fcd` | Ver "Achados críticos corrigidos" abaixo |
| 5. `ForgotPasswordForm.tsx` (wizard 3 passos) | ✅ Aprovado | `18e4fcd..c2dc022` | Notas menores não-bloqueantes: interval de cooldown pode disparar 2x em sucessão rápida, sem cleanup no unmount |
| 6. Atualizar CLAUDE.md (env vars + status backlog) | ✅ Aprovado | `c2dc022..b5a1197` | Fix: reviewer pegou que a reescrita tinha derrubado nota de débito de segurança pendente (action `search` ainda enumera usuários) — restaurada |
| Review final de branch inteira | ✅ Aprovado (com fixes menores) | `f25f58f` | Zero achado Crítico/Importante de código. Único gate é operacional (ver abaixo) |

## ✅ Feature completa — pronta pra revisão humana / push

Todas as 6 tasks do plano + review final de branch inteira aprovados. Branch: `worktree-forgot-password-sms-otp`, HEAD em `f25f58f`, 12 commits acima do ponto onde main estava (`c5d5da5`).

### O que o review final confirmou
- Fidelidade total ao plano: todas 6 tasks vieram como especificado, zero referência morta à ação `recover` antiga.
- Os 2 fixes de segurança aplicados durante o processo (comparação HMAC constant-time; bloqueio de account-takeover no `set-phone`) estão de fato no diff final, não só no relato dos subagentes.
- Integração entre tasks consistente: rota usa exatamente as funções dos libs criados nas Tasks 2/3; UI da Task 5 chama a rota da Task 4 com nomes de ação e formatos batendo.
- Migration da Task 1 bate coluna por coluna com o que a rota lê/escreve.
- Nenhum PII (nome, telefone, código OTP) vaza em `console.*`.
- Anti-enumeração no `confirm` ficou mais forte que o rascunho do próprio plano (unificou completamente as duas mensagens de erro).

### Limpezas menores aplicadas no fix final (commit `f25f58f`)
- Removida função morta `normalizePhone` (só usada pela ação `recover` já removida).
- Reescrita linha do backlog de segurança no CLAUDE.md que tinha ficado desatualizada (dizia que a rota inteira ainda era 🔴 CRÍTICO sem prova de identidade — não é mais verdade, só a ação `search`, não relacionada, ainda tem o problema de enumeração).

### Único gate restante: operacional, não código
Nada bloqueante no código. Falta, fora do escopo de código:
1. `npx supabase login` + `npx supabase db push` — aplicar a migration `password_reset_otps` (nunca foi aplicada em nenhum banco, CLI sem login neste ambiente).
2. Criar conta Twilio + configurar número compatível com Brasil.
3. Definir as 4 env vars novas em produção (Vercel): `PASSWORD_RESET_TOKEN_SECRET` (gerar com `openssl rand -hex 32`), `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.
4. Fluxo end-to-end real (SMS de verdade chegando no telefone) nunca foi testado neste ambiente — só revisão de código. Recomendo um teste manual real em staging assim que as credenciais/migration estiverem prontas, antes de confiar no fluxo em produção.

### Achados menores não-bloqueantes (ok deixar como está, ou revisitar depois)
- Normalização de telefone p/ E.164 pode confundir DDD 55 (RS) com prefixo de país — baixo risco (escola é em SP).
- `resend` reseta o contador de tentativas erradas do OTP (mitigado por cooldown de 60s + expiração de 5min + rate limit da `identify`).
- Countdown de reenviar código no wizard não limpa o interval ao desmontar o componente — cosmético.

### Push
Branch pushada pro remoto: `worktree-forgot-password-sms-otp` (https://github.com/Goes1404/testecompromisso.git). PR ainda não aberto — decisão de abrir PR vs. merge direto fica com você.

## Amendment pós-push: fluxo reordenado (telefone primeiro)

Depois do push inicial, pedido do dono do produto: telefone vira a chave primária de busca (não nome+nascimento). Fluxo novo:

1. **Tela telefone** (nova, primeira): aluno digita só o telefone → ação `lookup-phone`.
   - Bate com exatamente 1 conta → manda OTP, vai pra tela de código.
   - Bate com 0 contas → vai pra tela de fallback (nome+nascimento).
   - Bate com 2+ contas (telefone compartilhado, ex: responsável de irmãos) → mensagem específica mandando pra secretaria (decisão deliberada do dono do produto, não é bug de anti-enumeração).
2. **Tela fallback** (só se telefone não achou nada): nome completo + data de nascimento → ação `register-phone`. Mesma trava anti-sequestro de antes: resposta genérica idêntica tanto pra "não achou" quanto pra "achou mas já tem telefone" — evita reintroduzir o bug que já foi corrigido antes nesse branch.
3. **Tela código+senha**: inalterada.

Ações `identify`/`set-phone` foram REMOVIDAS da rota, substituídas por `lookup-phone`/`register-phone`. Ações `search`/`resend`/`confirm`/`register` não foram tocadas.

Commit: `dc9c94b` — revisado e aprovado (checagens de segurança específicas: trava anti-sequestro com resposta única, caso de telefone ambíguo não vaza detalhe de conta, rate limit por hash do telefone normalizado).

**Ainda não pushado** este commit de amendment — fazer `git push` de novo quando for continuar.

## Achados críticos corrigidos na Task 4

O reviewer + um scanner de segurança automático pegaram, na primeira passada da Task 4:

1. **CRÍTICO — account takeover**: ação `set-phone` sobrescrevia telefone de QUALQUER conta sem checar se já tinha telefone cadastrado. Atacante que soubesse nome+data de nascimento da vítima (mesma info fraca que já existia no fluxo antigo) conseguia roubar conta mesmo com telefone já cadastrado. **Corrigido**: agora `set-phone` rejeita (mensagem genérica, mesmo padrão anti-enumeração) se o perfil já tem telefone.
2. **Importante — anti-enumeração quebrada** no `confirm`: "código não encontrado" e "código errado" tinham mensagens/status diferentes, permitindo diferenciar os dois casos. **Corrigido**: unificado pra mesma resposta.
3. **Importante — vazamento de PII em log**: erro cru do Twilio (que pode conter o telefone completo em `error.message`) ia pro `console.error`. **Corrigido**: loga só `e?.code`.

Esses 3 pontos já estão commitados (`18e4fcd`). Re-review está rodando pra confirmar que os fixes realmente resolveram sem quebrar o fluxo legítimo (ex: conta sem telefone ainda precisa conseguir cadastrar um).

## Como continuar (para o próximo agente / Antigravity)

1. **Cheque o resultado da re-review da Task 4** — se aprovado, marque no ledger (`.superpowers/sdd/progress.md`) e siga pra Task 5. Se pegou algo novo, mais um ciclo de fix + re-review antes de avançar.
2. **Task 5 (UI wizard)** — o plano já tem o código completo pra `ForgotPasswordForm.tsx` (3 telas: identidade → telefone opcional → código+senha). É só seguir o plano, rodar `npm run typecheck` + `npm run build`, testar manualmente no browser (`npm run dev`, abrir `/forgot-password`).
3. **Task 6 (docs)** — adicionar as 4 env vars novas (`PASSWORD_RESET_TOKEN_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) no CLAUDE.md e marcar a Fase 2 do backlog de segurança como implementada.
4. **Review final de branch inteira** — depois das 6 tasks aprovadas, rodar uma revisão ampla do diff completo (`git merge-base main HEAD` até `HEAD`) antes de considerar pronto pra merge/push.
5. **Ações que exigem você (usuário), fora do código:**
   - Criar conta Twilio, configurar número compatível com Brasil (ou Messaging Service).
   - `npx supabase login` + `npx supabase db push` pra aplicar a migration da Task 1 (ainda não foi aplicada em nenhum banco).
   - Definir as 4 env vars novas em produção (Vercel) — `PASSWORD_RESET_TOKEN_SECRET` com valor aleatório forte (`openssl rand -hex 32`), as 3 do Twilio com as credenciais reais.
6. **Push**: nada foi enviado ao remoto ainda. Quando o branch estiver pronto (todas as tasks + review final aprovados), decidir: PR a partir de `worktree-forgot-password-sms-otp`, ou squash pro `main` local antes de subir — isso é decisão sua, não faça push sem confirmar.

## Ambiente

- Sem framework de testes automatizado no projeto (sem Jest/Vitest) — verificação é sempre `npm run typecheck` + `npm run build` + teste manual.
- Supabase CLI não autenticado neste ambiente (Task 1 não rodou o `db push` de fato).
- Sem credenciais Twilio configuradas neste ambiente (SMS real não foi testado end-to-end, só revisão de código).
