# Contas de Demonstração — Compromisso LMS

Contas públicas para exploração da plataforma. Marcadas com `is_demo = true` no banco.

> **Aviso:** Estas credenciais são públicas por design. Não contêm dados reais de alunos.

---

## Credenciais

| Papel     | E-mail                       | Senha            | Nome                          |
|-----------|------------------------------|------------------|-------------------------------|
| Aluno     | aluno@compromisso.com        | compromisso2026@ | Ana Beatriz Ferreira          |
| Professor | professor@compromisso.com    | compromisso2026@ | Carlos Eduardo Menezes        |
| Admin     | admin@compromisso.com        | compromisso2026@ | Renata Souza Lima             |
| Staff     | staff@compromisso.com        | compromisso2026@ | Marcos Vieira Costa           |

**URL de login:** https://compromissose.com/login

---

## O que cada conta demonstra

### Aluno — Ana Beatriz Ferreira
- Dashboard de desempenho com gráficos (XP: 3.240 pts)
- Histórico de 3 simulados ENEM (61%, 67%, 74%)
- 2 redações corrigidas pela IA Aurora (notas 82 e 78)
- 20 questões respondidas no banco de questões
- Sequência de estudos: 21 dias consecutivos (recorde: 45 dias)
- 4 conquistas (badges) desbloqueadas
- Caderno de notas com 3 notas em História, Matemática e Redação

### Professor — Carlos Eduardo Menezes
- Painel do professor com gestão de turmas
- 4 aulas ao vivo: 2 agendadas (próximos 3 e 10 dias) + 2 concluídas
- Banco de questões e criação de provas

### Admin — Renata Souza Lima
- Painel administrativo com visão geral da plataforma
- 3 comunicados publicados (alta, média e baixa prioridade)
- Gestão de usuários, turmas e analytics

### Staff — Marcos Vieira Costa
- Painel de secretaria
- Cadastro e gerenciamento de alunos
- Geração de documentos e links de acesso

---

## Re-seeding

Para resetar os dados demo ao estado inicial, execute a migration:

```bash
npx supabase db push
```

Ou rode manualmente no Supabase Studio:

```
supabase/migrations/20260615000000_demo_accounts_seed.sql
```

---

## IDs fixos (para referência)

| Conta              | UUID                                   |
|--------------------|----------------------------------------|
| aluno              | `cca86ded-1c50-4f7d-909c-f3ba2223068e` |
| professor          | `c9f9b9f3-52cc-4f71-abdd-eea2bf08e43f` |
| admin              | `00000000-0000-0000-0000-000000000099`  |
| staff              | `00000000-0000-0000-0000-000000000098`  |
