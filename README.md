'''
<div align="center">

# Compromisso | Smart Education

**_Tecnologia industrial a serviço da sua aprovação._**

</div>

---

## ✨ Status do Projeto: MVP Premium Consolidado

A plataforma **Compromisso** atingiu o estado de **Alta Fidelidade Operacional**. Este MVP não é apenas uma prova de conceito; é um sistema robusto e funcional que integra inteligência artificial, governança de dados e uma experiência de usuário focada em alta performance acadêmica. A arquitetura está pronta para escalar.

---

## 🚀 Nossos Diferenciais: Uma Plataforma 360º

A Compromisso foi desenhada sobre três pilares interconectados, criando um ecossistema completo para o sucesso do aluno e a eficiência do educador.

> ### 🎓 **Jornada do Aluno: A Rota da Aprovação**
> O arsenal completo para o estudante de alta performance.
>
> - **📝 Central de Redação com IA:**
>   - **Correção Automatizada:** Submeta sua redação e receba uma análise detalhada gerada por IA (Google Gemini).
>   - **Nota por Competência:** A IA avalia o texto com base nas 5 competências do ENEM, atribuindo notas de 0 a 200 para cada, totalizando a nota final de 1000.
>   - **Feedback Construtivo:** Receba sugestões claras para melhorar coesão, argumentação, gramática e proposta de intervenção.
>
> - **🗂️ Central de Documentação para Matrícula:**
>   - **Checklist Inteligente:** Um guia persistente e interativo para organizar todos os documentos necessários para SiSU e ProUni.
>   - **Organização em Nuvem:** Garanta que nenhum documento seja perdido ou esquecido.
>
> - **📊 Simulador de Elegibilidade Social:**
>   - **Motor de Cálculo:** Descubra instantaneamente sua elegibilidade para políticas de isenção e cotas, com o perfil sendo atualizado automaticamente.
>
> - **👨‍🏫 Sala de Aula Premium & Simulados:**
>   - **Player de Vídeo Rastreável:** Acompanhe o progresso de forma precisa.
>   - **Banco de Questões Inteligente:** Simulados com questões aleatórias via RPC Supabase para um treino contínuo e sem repetições.
>   - **Aurora IA:** Um assistente de IA para tirar dúvidas em tempo real.

> ### 🧑‍🏫 **Studio Master: O Estúdio do Mentor**
> Ferramentas de nível profissional para quem ensina.
>
> - **📚 Gestão de Trilhas de Aprendizagem 360°:**
>   - **Autoria Completa:** Crie módulos, aulas e anexe múltiplos formatos de materiais de apoio.
> 
> - **✍️ Banco Central de Questões:**
>   - **Repositório Unificado:** Alimente os simulados da plataforma de forma massiva e organizada.
>
> - **📡 Console de Transmissão:**
>   - **Estúdio de Controle:** Monitore o status e a qualidade do sinal de aulas e reuniões externas.

> ### 🛡️ **Gabinete de Gestão: A Visão do Administrador**
> Governança, segurança e inteligência de dados para a gestão educacional.
>
> - **📊 Business Intelligence & Analytics:**
>   - **Visão Estratégica:** Dashboards que revelam insights sobre engajamento de alunos, risco de evasão e performance geral da instituição.
>
> - **🔐 Auditoria e Supervisão:**
>   - **Análise de Documentos:** Visão térmica para identificar quais alunos estão prontos para a matrícula e quais precisam de suporte.
>   - **Supervisão Ética:** Ferramentas para garantir a segurança e a qualidade das interações entre mentores e alunos.

---

## 🛠️ Tech Stack & Arquitetura

A plataforma foi construída com tecnologias de ponta, escolhidas para garantir escalabilidade, performance e uma experiência de desenvolvimento moderna.

- **Framework:** **Next.js 15** (App Router)
- **Backend & DB:** **Supabase** (Auth, Postgres DB, Real-time, Storage)
- **Inteligência Artificial:** **Google Gemini** (via Genkit)
- **UI/UX:** **Shadcn UI** & **Tailwind CSS**
- **Fontes:** `Inter` para UI e uma fonte customizada para headlines.

---

## ⚙️ Configuração do Ecossistema

Para executar o projeto localmente, siga os passos:

1.  **Estrutura do Banco:** O arquivo `docs/database.sql` contém o schema completo do banco de dados. Utilize-o para configurar sua instância no Supabase. Ele inclui:
    - Tabelas Relacionais
    - Funções RPC para os simulados
    - Policies de RLS (Row Level Security)
    - Triggers para automações (ex: criação de perfil no cadastro)

2.  **Variáveis de Ambiente:** Renomeie o arquivo `.env.example` para `.env.local` e preencha com as suas chaves do Supabase e outras configurações necessárias.

3.  **Instale as dependências e rode o projeto:**
    ```bash
    npm install
    npm run dev
    ```

---

<div align="center">

**Equipe Compromisso**

*Sua aprovação é o nosso compromisso.*

</div>
'''