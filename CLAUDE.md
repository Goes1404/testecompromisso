# Projeto: Cursinho Compromisso LMS

Plataforma de gestão educacional e aprendizado adaptativo para alunos do cursinho Compromisso (Santana de Parnaíba).

## 🚀 Stack Tecnológica
- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS + Shadcn/UI (Design Premium: bordas arredondadas `2.5rem`, títulos em itálico, sombras suaves).
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **IA**: Aurora (OpenAI GPT-4o-mini via Vercel AI SDK)
- **Ícones**: Lucide React

## 🗂 Estrutura do Banco de Dados (Principais Tabelas)
- `profiles`: id, full_name, email, role (`admin`, `teacher`, `student`), profile_type, institution.
- `questions`: question_text, options (JSONB), correct_answer, subject_id, micro_topic_id, explanation, target_audience.
- `subjects`: id, name.
- `exams`: id, title, year, exam_type.
- `exam_questions`: exam_id, question_id, order_index.
- `student_question_answers`: student_id, question_id, selected_option, is_correct.

## 🛠 Comandos Frequentes
- `npm run dev`: Iniciar ambiente de desenvolvimento.
- `npm run build`: Validar build de produção.
- `npx supabase login`: Autenticar no CLI do Supabase.

## 🎨 Padrões de Design & UX
- **Estilo Visual**: Cartões com `shadow-2xl`, bordas `rounded-[2.5rem]`, fontes pretas e pesadas para títulos (`font-black`), uso frequente de `italic`.
- **Feedback**: Sempre use o hook `useToast` para ações de sucesso ou erro.
- **IA Aurora**: Identidade pedagógica, rigorosa, concisa e carinhosa.

## 🧠 Regras de Desenvolvimento (Memória para o Claude)
- **Componentes**: Prefira Server Components por padrão. Use `"use client"` apenas quando houver interatividade.
- **Database**: Sempre verifique as colunas nas migrations (`/supabase/migrations`) antes de realizar queries.
- **Segurança**: Respeite as RLS (Row Level Security) do Supabase; filtre dados por `user.id` ou `role`.
- **IA Extraction**: A lógica de extração de questões em massa está em `src/app/api/chat/route.ts`. Use `maxTokens: 4000` para JSONs grandes.
- **Simulados**: Devem seguir o padrão ENEM (3.5 min/questão, navegação por grade, opção de revisão).

## 📌 Links e Pastas Importantes
- `/src/app/dashboard`: Rotas principais separadas por cargo (student/teacher/admin).
- `/src/components/ui`: Componentes base do Shadcn.
- `/src/lib`: Funções utilitárias, lógica de gamificação e constantes.
