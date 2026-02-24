
# Compromisso | Smart Education

*Tecnologia a serviço da aprovação.*

---

## ✨ Status Atual (Agosto/2024)

O projeto está **estável e sincronizado**. Todas as funcionalidades de Banco de Questões, Simulados IA, Trilhas Pedagógicas e Chat em Tempo Real estão operacionais. O sistema utiliza Supabase para persistência e Google AI (Genkit) para inteligência pedagógica.

---

## 🎯 Configuração do Banco de Dados (Supabase)

Para garantir que todas as tabelas e funções RPC funcionem corretamente, **é obrigatório** executar o script SQL mestre:

1.  Acesse o seu painel do **Supabase**.
2.  Vá em **SQL Editor** no menu lateral esquerdo.
3.  Clique em **"New Query"**.
4.  Copie o conteúdo do arquivo `docs/database.sql` do projeto.
5.  Clique em **"Run"**.

Isso resolverá erros de "coluna não encontrada", "AbortError" ou problemas no sorteio de questões do simulado.

---

## 🚀 Guia de Início Rápido

### 1. Pré-requisitos
- Node.js 20+
- Chaves do Supabase e Google Gemini configuradas no `.env.local`

### 2. Rodar o Projeto
```bash
npm install
npm run dev
```

### 3. Contas de Teste
Utilize os botões de atalho na página de Login para acessar como Aluno, Mentor ou Gestor.

---

## ✨ Funcionalidades Principais

- **Banco de Questões**: Cadastro manual ou sugestão por IA Aurora com suporte a JSONB.
- **Simulados Inteligentes**: Sorteio randômico por matéria via funções PostgreSQL (RPC) otimizadas.
- **Trilhas de Estudo**: Caminhos pedagógicos com vídeos, PDFs e atividades práticas.
- **Centro de Transmissões**: Integração industrial com Google Meet e Studio Master.
- **Comunidade Ativa**: Fóruns em tempo real e Chat Direto com Mentores.

---

## 🛠️ Arquitetura
- **Next.js 15**: App Router, Server Components e React 19 hooks.
- **Tailwind & Shadcn UI**: Design industrial de alta fidelidade e pixels precisos.
- **Supabase**: Auth, PostgreSQL, Realtime e RLS dinâmico.
- **Genkit**: Engine de IA para suporte pedagógico e correções de redação.
