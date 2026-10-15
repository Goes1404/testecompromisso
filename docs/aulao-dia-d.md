# Aulão pela plataforma — roteiro do dia D

O maior teste da plataforma: ~855 alunos assistindo pelo YouTube embutido, com
chat, dúvidas e chamada automática, tudo dentro da sala. Este roteiro é o que
precisa acontecer antes, durante e depois para sair perfeito. Quem roda:
**coordenação** (cadastro, avisos), **professor** (YouTube e estúdio) e
**quem cuida da plataforma** (ensaio de carga, painel do Supabase).

## Uma semana antes

1. **Ensaio de carga** (quem cuida da plataforma), no computador, com o
   `.env.local` de produção e o `SUPABASE_JWT_SECRET` do painel:
   ```
   npx tsx scripts/ensaio-da-live.ts --alunos 300 --minutos 3 --sim
   npx tsx scripts/ensaio-da-live.ts --alunos 900 --minutos 5 --sim
   ```
   O que é bom: p95 do chat e da presença abaixo de 1 s, zero erros. Se o p95
   passar de 3 s ou aparecerem erros de conexão com 900 alunos, o banco está
   pequeno: no painel do Supabase, *Settings → Compute*, subir um degrau só
   para o dia (reinicia o banco; faça fora do horário de aula). Ao terminar,
   confirme que o script limpou tudo (ele apaga a aula e as contas de ensaio).
2. **Preencher a sala dos alunos sem turma** (coordenação). Em 15/10 eram
   **201 alunos ativos** sem sala. Eles não veem aula restrita a turmas. Se não
   der tempo, agende o aulão **sem escolher turma** (vale para todos).
3. **Ativar o push** (coordenação, nas salas): em 15/10 só 81 aparelhos tinham
   push ativo para 1.083 alunos. O aviso de "estamos ao vivo" só chega a quem
   ativou. Reforçar também por WhatsApp no dia.
4. **Apagar da agenda a aula "ENSAIO DE CARGA (pode apagar)"** que ficou de uma
   medição em 15/10 (está agendada para o ano 2000, nenhum aluno vê).

## Um dia antes (professor, pelo computador)

1. No **YouTube Studio → Transmitir → Agendar transmissão**: visibilidade
   **Não listada**, em *Mostrar mais* marcar **Permitir incorporação**, público
   **não é conteúdo para crianças**, latência **baixa** (não "ultra baixa": cai
   mais em rede móvel). Copiar o link da transmissão.
2. Na plataforma, **Professor → Aulas ao vivo → Nova aula**: título, horário,
   turmas (vazio = todos) e o link colado. Ao salvar, o aviso de "agendada" sai
   para os alunos.
3. Abrir o **estúdio** da aula. O cartão acima do player tem de estar **verde**
   ("Vídeo pronto para os alunos"). Vermelho = corrija no YouTube Studio e
   clique em *Verificar de novo*. Não deixe para o dia.

## No dia, 30 minutos antes

1. Professor, no computador: YouTube Studio aberto numa aba, estúdio da
   plataforma em outra. Celular não serve para transmitir.
2. **Iniciar a transmissão no YouTube primeiro.** Só depois, no estúdio,
   **Abrir para alunos**. Se abrir antes, o aluno entra e vê a contagem
   regressiva do YouTube, e a presença começa a contar sem aula.
3. "Abrir para alunos" confere o vídeo de novo com o YouTube. Se barrar, a
   mensagem diz o que corrigir. Se disser "não deu para conferir", a sala abre
   mesmo assim: olhe se o vídeo aparece no seu próprio estúdio.
4. O aviso de "ao vivo" sai **uma vez** por aula. Abrir, fechar e reabrir não
   repete o push, mas **recalcula a chamada**: evite.

## Durante a aula

| O que olhar | Onde | Normal | Sinal de problema |
|---|---|---|---|
| Quantos entraram | Painel da chamada no estúdio | Sobe nos primeiros 5 min | Fica em zero: o push não saiu ou a aula está restrita a turmas |
| Chat | Estúdio, coluna da direita | Mensagem de aluno chega em até 5 s; com o chat parado, até 10 s | Nada chega por minutos com alunos na sala: ver o painel do Supabase |
| Banco | Supabase → Reports → API / Database | CPU abaixo de 70 % | CPU em 100 % ou erros 5xx: o chat atrasa, o vídeo **não** para (é do YouTube) |
| Vídeo | Pergunte no chat "quem está sem vídeo?" | Ninguém | Vários: no computador há o link "Abrir no app do YouTube" abaixo do player |

Regras de bolso:

- **O vídeo não depende da plataforma.** Se a plataforma travar, a transmissão
  continua no YouTube. Plano B: mandar o link do YouTube pelo WhatsApp das
  turmas e marcar a chamada à mão depois.
- **Não encerre no meio.** Encerrar gera a chamada com o tempo até ali.
- **Moderação:** no estúdio, toque na mensagem para ocultar ou silenciar o
  aluno naquela aula. Nada é apagado.
- Dúvidas privadas chegam na fila do estúdio; o aluno só vê as dele.

## Ao terminar

1. Só depois de encerrar no YouTube, **Encerrar aula** no estúdio. Confirme.
   Presente é quem ficou **60 %** do tempo com a sala aberta. Aula com menos de
   10 minutos no ar não gera chamada.
2. **Ver chamada** aparece no painel. A secretaria pode corrigir à mão; o
   automático nunca sobrescreve o que foi marcado manualmente.
3. Contas duplicadas (201 alunos têm mais de uma) entram como ausentes na conta
   que o aluno não usou. Se a secretaria for cobrar falta, conferir antes.
4. Anotar: pico de alunos na sala, p95 do chat visto no Supabase, reclamações.
   É isso que calibra o próximo aulão.
