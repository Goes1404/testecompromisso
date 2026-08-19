# -*- coding: utf-8 -*-
"""Gera a apresentação comercial da plataforma (HTML -> PDF via Chromium)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from icons import ICONS

BRAND = "Plataforma 360"          # nome comercial — trocar aqui muda o deck inteiro
TAGLINE = "Sistema de ensino e gestão escolar"

TINTS = {
  "blue":   ("rgba(37,99,235,.10)",  "#2563EB"),
  "cyan":   ("rgba(6,182,212,.12)",  "#0891B2"),
  "violet": ("rgba(124,58,237,.11)", "#7C3AED"),
  "amber":  ("rgba(217,119,6,.12)",  "#D97706"),
  "green":  ("rgba(5,150,105,.12)",  "#059669"),
  "pink":   ("rgba(219,39,119,.10)", "#DB2777"),
}

def icon(name, stroke="currentColor", size=None):
    s = f' style="width:{size}px;height:{size}px"' if size else ""
    return (f'<svg viewBox="0 0 24 24" stroke="{stroke}"{s}>{ICONS[name]}</svg>')

def ico(name, tint="blue"):
    bg, fg = TINTS[tint]
    return f'<div class="ico" style="background:{bg}">{icon(name, fg)}</div>'

def card(name, title, desc, tint="blue"):
    return (f'<div class="card">{ico(name, tint)}'
            f'<h3>{title}</h3><p>{desc}</p></div>')

def feat(title, desc):
    return (f'<div class="feat"><span class="tick">{icon("check_min","#fff")}</span>'
            f'<span><b>{title}</b><span>{desc}</span></span></div>')

ICONS["check_min"] = '<path d="m4 12 5.5 5.5L20 7"/>'

def stat(n, l, color="#2563EB"):
    return f'<div class="stat"><div class="n" style="color:{color}">{n}</div><div class="l">{l}</div></div>'

def band(name, html):
    return (f'<div class="band"><div class="bi">{icon(name,"#fff")}</div><p>{html}</p></div>')

def head(kicker, title, lead="", right=""):
    lead = f'<p class="lead">{lead}</p>' if lead else ""
    right = f'<div>{right}</div>' if right else ""
    return (f'<div class="head"><div><div class="kicker">{kicker}</div>'
            f'<h2 style="margin-top:12px">{title}</h2>{lead}</div>{right}</div>')

SLIDES = []
def slide(body, dark=False, mesh=False, rule=True, no_chrome=False):
    cls = "slide" + (" dark" if dark else "") + (" mesh" if mesh else "")
    n = len(SLIDES) + 1
    chrome = "" if no_chrome else (
        f'<div class="brandmark"><span class="dot"></span>{BRAND}</div>'
        f'<div class="pgno">{n:02d}</div>')
    r = '<div class="rule"></div>' if rule else ""
    SLIDES.append(f'<section class="{cls}">{r}<div class="pad">{body}</div>{chrome}</section>')

# ══════════════════ 01 — CAPA ══════════════════
slide(f'''
<div style="position:absolute;left:72px;top:96px;right:72px">
  <div class="chip" style="background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.22);color:#DCE5FF">
    {icon("sparkles","#7DD3FC",13)} Apresentação institucional · 2026
  </div>
  <h1 style="margin-top:30px;max-width:940px">
    Toda a jornada escolar<br>em <span class="grad">uma única plataforma</span>
  </h1>
  <p class="lead" style="margin-top:26px;max-width:700px;font-size:18.5px;color:#B9C6E4">
    Aprendizado adaptativo, correção de redação por inteligência artificial e gestão
    acadêmica, operacional e financeira — integrados numa só base de dados,
    com a marca da sua instituição.
  </p>
  <div class="chips" style="margin-top:34px">
    <span class="chip">Aluno</span><span class="chip">Professor</span>
    <span class="chip">Secretaria</span><span class="chip">Gestão</span>
    <span class="chip">Responsável</span>
  </div>
</div>
<div style="position:absolute;left:72px;bottom:74px;right:72px;display:flex;justify-content:space-between;align-items:flex-end">
  <div>
    <div style="font-family:Manrope;font-weight:800;font-size:23px;color:#fff;letter-spacing:-.02em">{BRAND}</div>
    <div style="font-size:12.5px;color:#8FA0C4;margin-top:5px;letter-spacing:.04em">{TAGLINE}</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#7A8BB0;letter-spacing:.14em;text-transform:uppercase">
    Documento confidencial<br>
    <span style="color:#5F7096">Distribuição restrita</span>
  </div>
</div>''', dark=True, mesh=True, no_chrome=True)

# ══════════════════ 02 — O PROBLEMA ══════════════════
slide(head("O cenário atual",
  "A escola já é digital.<br>O que falta é ser <span style=\"color:#2563EB\">uma coisa só</span>.",
  "Gestão acadêmica hoje acontece em ferramentas que não se falam. O dado existe — "
  "espalhado em seis lugares, nenhum deles conectado ao outro.") + f'''
<div class="grid g3" style="margin-top:4px">
  {card("file","Planilhas para tudo","Notas, presença e cadastro em arquivos paralelos. Duas versões da mesma verdade, e ninguém sabe qual vale.","amber")}
  {card("message","Comunicação em grupo de mensagem","Aviso importante disputa espaço com corrente e figurinha. Não há registro, nem confirmação de leitura, nem histórico.","amber")}
  {card("pen","Redação corrigida à mão","O professor leva duas semanas por turma. O aluno recebe a nota quando já esqueceu o que escreveu.","amber")}
  {card("clock","Simulado que vira PDF morto","A prova é aplicada, o gabarito é conferido, e o desempenho por habilidade nunca é calculado.","amber")}
  {card("eye","Zero visibilidade de evasão","O gestor descobre que o aluno parou de estudar no dia em que ele não volta mais.","amber")}
  {card("lock","Dado sensível sem controle","Boletim, documento e contato de menor de idade circulando por e-mail e pendrive, sem trilha de auditoria.","amber")}
</div>
{band("alert", "<b>O custo não é o software.</b> É a hora de coordenação gasta reconciliando planilha, "
      "o aluno que evade sem sinal de alerta e a decisão pedagógica tomada no achismo.")}''')

# ══════════════════ 03 — A SOLUÇÃO ══════════════════
def hub_node(x, y, w, h, title, lines, accent):
    t = f'<text x="{x+18}" y="{y+34}" class="nt">{title}</text>'
    for i, ln in enumerate(lines):
        t += f'<text x="{x+18}" y="{y+58+i*17}" class="nd">{ln}</text>'
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="15" fill="rgba(255,255,255,.065)" '
            f'stroke="rgba(255,255,255,.15)"/>'
            f'<rect x="{x}" y="{y+16}" width="3.5" height="{h-32}" rx="2" fill="{accent}"/>{t}')

HUB = f'''<svg viewBox="0 0 1136 384" style="width:100%;height:404px;margin-top:24px">
  <defs>
    <linearGradient id="core" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563EB" stop-opacity=".85"/>
      <stop offset="1" stop-color="#7C3AED" stop-opacity=".72"/>
    </linearGradient>
    <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#60A5FA" stop-opacity=".12"/>
      <stop offset=".5" stop-color="#22D3EE" stop-opacity=".5"/>
      <stop offset="1" stop-color="#60A5FA" stop-opacity=".12"/>
    </linearGradient>
    <style>
      .nt{{font-family:Manrope,sans-serif;font-weight:700;font-size:15px;fill:#fff}}
      .nd{{font-family:Inter,sans-serif;font-size:11.4px;fill:#9FB0D2}}
      .ct{{font-family:Manrope,sans-serif;font-weight:800;font-size:21px;fill:#fff;text-anchor:middle}}
      .cd{{font-family:Inter,sans-serif;font-size:11.6px;fill:#D3E0FB;text-anchor:middle}}
    </style>
  </defs>
  <g stroke="url(#ln)" stroke-width="1.6" fill="none">
    <path d="M418 192 C 380 192, 372 104, 336 104"/>
    <path d="M418 192 C 380 192, 372 280, 336 280"/>
    <path d="M718 192 C 756 192, 764 74, 800 74"/>
    <path d="M718 192 H 800"/>
    <path d="M718 192 C 756 192, 764 310, 800 310"/>
  </g>
  <g fill="#22D3EE"><circle cx="418" cy="192" r="3.4"/><circle cx="718" cy="192" r="3.4"/></g>
  {hub_node(36, 58, 300, 92, "Aluno", ["Estuda, treina redação e acompanha", "o próprio desempenho todo dia"], "#3B82F6")}
  {hub_node(36, 234, 300, 92, "Professor", ["Cria conteúdo, corrige e mede", "a turma por habilidade"], "#8B5CF6")}
  {hub_node(800, 28, 300, 92, "Secretaria", ["Matrícula, documento, frequência,", "boletim e financeiro"], "#06B6D4")}
  {hub_node(800, 146, 300, 92, "Gestão", ["Indicador de rede, aluno em risco,", "moderação e auditoria"], "#F59E0B")}
  {hub_node(800, 264, 300, 92, "Responsável", ["Acompanha o filho por link seguro,", "sem precisar de conta"], "#10B981")}
  <rect x="418" y="120" width="300" height="144" rx="22" fill="url(#core)" stroke="rgba(147,197,253,.42)"/>
  <text class="ct" x="568" y="171">{BRAND}</text>
  <text class="cd" x="568" y="199">Base única de dados</text>
  <text class="cd" x="568" y="218">Permissão por perfil</text>
  <text class="cd" x="568" y="237">Marca própria · multi-instituição</text>
</svg>'''

slide(f'''
<div class="kicker">A proposta</div>
<h2 style="margin-top:12px;max-width:920px">Cinco perfis, um único sistema,<br>
<span class="grad">a mesma base de dados</span></h2>
<p class="lead" style="margin-top:12px;max-width:870px;color:#AEBBD8">
  O que o aluno estuda alimenta o painel do professor. O que o professor corrige alimenta o
  boletim. O que a secretaria matricula alimenta a chamada. Nada é digitado duas vezes.</p>
{HUB}''', dark=True, mesh=True)

# ══════════════════ 04 — MAPA DE MÓDULOS ══════════════════
slide(head("Visão geral", "O que está pronto e rodando",
  "Não é roadmap. Cada módulo abaixo é tela existente, em produção, com dado real trafegando.") + f'''
<div class="grid g4" style="margin-top:2px">
  {card("brain","Simulados & Provas","Prova completa no padrão do exame e nota calculada por TRI.","blue")}
  {card("pen","Redação com IA","Cinco competências em minutos, com revisão do professor.","violet")}
  {card("sparkles","Mentor de IA","Assistente pedagógico 24 horas, com o contexto da aula.","cyan")}
  {card("compass","Trilhas & Aulas","Percurso com módulos, vídeo, material e aprovação.","green")}
  {card("video","Aulas ao vivo","Agendamento, sala, chat moderado e gravação publicada.","pink")}
  {card("message","Fórum & Atendimento","Fórum por matéria e canal direto de dúvida, auditável.","blue")}
  {card("trophy","Engajamento","Pontos, níveis, ofensiva, missões, conquistas e ranking.","amber")}
  {card("network","Caderno & Grafo","Notas em blocos, links entre elas e grafo do conhecimento.","violet")}
  {card("check","Frequência","Chamada por código na sala, com barreira antifraude.","cyan")}
  {card("cap","Boletim & Notas","Importação em massa, aprovação em duas etapas e boletim.","green")}
  {card("wallet","Secretaria & Financeiro","Matrícula, documento, declaração e pagamento de professores.","amber")}
  {card("chart","BI & Analytics","Desempenho por micro-tópico, aluno em risco e funil de uso.","blue")}
</div>''')

# ══════════════════ 05 — NÚMEROS ══════════════════
slide(head("Dimensão do produto", "Uma plataforma madura, não um protótipo",
  "Números da aplicação em produção — superfície de produto já construída, testada e versionada.") + f'''
<div class="stats" style="margin-top:6px">
  {stat("93","telas de sistema entregues, distribuídas entre os cinco perfis","#2563EB")}
  {stat("55","tabelas de dados modelando toda a operação acadêmica","#0891B2")}
  {stat("38","serviços de back-end para IA, integrações e automações","#7C3AED")}
  {stat("110","migrações de banco versionadas, com histórico auditável","#D97706")}
</div>
<div class="grid g3" style="margin-top:22px">
  {card("zap","Construída para celular","O aluno acessa do aparelho que tem, na rede que tem. Instalável como aplicativo, com tela que carrega antes da imagem chegar.","cyan")}
  {card("shield","Segurança auditada","Isolamento de dados por usuário direto no banco, auditoria periódica e correções aplicadas e versionadas.","green")}
  {card("globe","Pronta para várias instituições","Cada escola com seu endereço, sua marca, suas cores e seus dados isolados dos demais.","violet")}
</div>
{band("check", "<b>Nada aqui é promessa de roadmap.</b> Toda funcionalidade apresentada neste documento "
      "existe como tela em produção, com uso real registrado.")}''')

# ══════════════════ 06 — DIVISOR: O ALUNO ══════════════════
slide(f'''
<div style="display:flex;align-items:center;gap:60px;height:100%">
  <div style="flex:1.15">
    <div class="kicker" style="color:#7FA9FF">Perfil 01 de 05</div>
    <h1 style="margin-top:18px;font-size:66px">O aluno</h1>
    <p class="lead" style="margin-top:22px;color:#AEBBD8;font-size:17.5px;max-width:520px">
      Um ambiente que ele abre por vontade própria: estuda, treina, mede o próprio
      progresso e volta no dia seguinte. Engajamento aqui é métrica, não discurso.</p>
    <div class="chips" style="margin-top:30px">
      <span class="chip">Estudo e avaliação</span><span class="chip">Redação com IA</span>
      <span class="chip">Mentor de IA</span><span class="chip">Gamificação</span>
      <span class="chip">Caderno digital</span><span class="chip">Vida escolar</span>
    </div>
  </div>
  <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:13px">
    {card("brain","Estudar","Simulado, prova completa, desafio diário e flashcard com repetição espaçada.","blue")}
    {card("pen","Escrever","Redação corrigida nas cinco competências, em minutos, com espelho detalhado.","violet")}
    {card("flame","Persistir","Ofensiva diária, missões semanais, conquistas e ranking entre colegas.","amber")}
    {card("gauge","Enxergar","Desempenho por matéria e por habilidade, com evolução ao longo do tempo.","cyan")}
  </div>
</div>''', dark=True, mesh=True)

# ══════════════════ 07 — ALUNO: ESTUDO ══════════════════
slide(head("Aluno · Estudo e avaliação", "Da questão solta à nota que significa alguma coisa",
  "O aluno não treina no vazio: cada resposta alimenta o diagnóstico dele e o painel do professor.") + f'''
<div style="display:grid;grid-template-columns:1.08fr .92fr;gap:26px;margin-top:2px">
  <div class="feats">
    {feat("Prova completa no padrão do exame","Cronômetro proporcional, navegação por grade, marcação para revisão e correção ao final.")}
    {feat("Simulado por matéria","Blocos curtos por disciplina e micro-tópico, para treinar exatamente o ponto fraco.")}
    {feat("Nota por Teoria de Resposta ao Item","Modelo de três parâmetros com estimação estatística: acertar item difícil pesa mais, chute pesa contra. Nota na escala de 0 a 1000, com faixa de confiança.")}
    {feat("Flashcards com repetição espaçada","O sistema calcula quando cada carta deve voltar. Quem erra revê logo; quem acerta revê depois.")}
    {feat("Desafio diário","Uma questão por dia, com recompensa, para criar rotina em vez de maratona véspera de prova.")}
    {feat("Explicação em toda questão","Texto de apoio, imagem e resolução comentada — errar vira aula, não só ponto perdido.")}
  </div>
  <div style="display:flex;flex-direction:column;gap:13px">
    {card("database","Banco de questões próprio","Provas oficiais importadas automaticamente e questões autorais da escola no mesmo acervo, classificadas por matéria e micro-tópico.","blue")}
    {card("scan","Prova em PDF vira prova digital","A IA lê o arquivo, separa enunciado, alternativas, gabarito e texto de apoio, e devolve tudo estruturado para revisão do professor.","violet")}
    {band("gauge","<b>O efeito prático:</b> o aluno descobre o que estudar amanhã sem depender de alguém para dizer.")}
  </div>
</div>''')

# ══════════════════ 08 — ALUNO: REDAÇÃO ══════════════════
slide(head("Aluno · Redação", "Duas semanas de correção viram dois minutos",
  "O gargalo mais caro da preparação escolar, resolvido sem tirar o professor da decisão final.") + f'''
<div style="display:grid;grid-template-columns:.94fr 1.06fr;gap:26px;margin-top:2px">
  <div style="display:flex;flex-direction:column;gap:13px">
    {card("scan","Foto do papel, direto do celular","O aluno fotografa a redação manuscrita. O sistema transcreve preservando os parágrafos e corrige o texto transcrito — sem punir o aluno por ruído de digitalização.","cyan")}
    {card("pen","Espelho de correção","Os trechos que motivaram cada desconto aparecem destacados dentro do próprio texto. O aluno vê onde errou, não só quanto tirou.","violet")}
  </div>
  <div class="feats">
    {feat("Correções independentes, como em banca real","O sistema roda avaliações paralelas e cegas e aplica o protocolo oficial de discrepância. Divergiu demais entre corretores? Entra uma terceira leitura.")}
    {feat("Cinco competências, escala oficial","Cada competência recebe nota na régua padronizada da matriz de referência. O total é a soma, de 0 a 1000 — nada de nota inventada no meio.")}
    {feat("Anulação verificada antes de tudo","Fuga ao tema, tipo textual errado e demais situações de anulação são checadas primeiro, na mesma ordem da banca oficial.")}
    {feat("O professor continua no comando","A correção chega pronta para revisão: o professor ajusta nota, escreve comentário e devolve. A IA tira o trabalho braçal, não a autoridade pedagógica.")}
    {feat("Propostas de tema prontas","Temas com textos motivadores gerados para a turma, ou cadastrados pela coordenação.")}
  </div>
</div>
{band("clock","<b>Impacto direto:</b> o aluno escreve mais porque recebe retorno rápido — e o professor "
     "passa a corrigir por amostragem e exceção, no lugar de pilha por pilha.")}''')

# ══════════════════ 09 — ALUNO: MENTOR DE IA ══════════════════
slide(f'''
<div class="kicker">Aluno · Mentor de inteligência artificial</div>
<h2 style="margin-top:12px;max-width:880px">Um professor particular disponível<br>
<span class="grad">às três da manhã</span></h2>
<p class="lead" style="margin-top:14px;max-width:840px;color:#AEBBD8">
  A dúvida do aluno não espera o horário de aula. O mentor de IA responde em português,
  em linguagem didática, e sabe onde o aluno está dentro da plataforma.</p>
<div class="grid g3" style="margin-top:32px">
  {card("sparkles","Presente em toda tela","Um botão flutuante acompanha o aluno pelo sistema inteiro. A dúvida é resolvida onde ela nasce, sem trocar de aplicativo.","cyan")}
  {card("compass","Consciente do contexto","Dentro da aula, o mentor já sabe qual unidade está sendo estudada e responde sobre aquele conteúdo — não sobre o assunto genérico.","violet")}
  {card("heart","Com a cara do aluno","O assistente assume o rosto do mascote que o aluno adotou. Detalhe pequeno, efeito grande sobre quem tem 16 anos e não pede ajuda a adulto.","pink")}
  {card("target","Sugestão de próximo passo","A partir do histórico de acertos e erros, o sistema aponta o que estudar em seguida, em vez de deixar o aluno escolher no escuro.","blue")}
  {card("shield","Limites definidos","Em assunto administrativo — prazo, documento, isenção — o mentor orienta procurar a secretaria em vez de inventar resposta.","green")}
  {card("message","Sem substituir gente","Quando a dúvida passa do ponto, o aluno abre conversa com o professor de verdade, dentro da mesma tela.","amber")}
</div>''', dark=True, mesh=True)

# ══════════════════ 10 — ALUNO: ENGAJAMENTO ══════════════════
slide(head("Aluno · Engajamento", "O problema não é ensinar. É fazer voltar amanhã.",
  "Sistema de progressão desenhado para criar hábito diário — e blindado contra quem tenta burlar.") + f'''
<div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:2px">
  <div class="feats">
    {feat("Pontuação, níveis e conquistas","Sete níveis de progressão e conquistas por marco atingido. O avanço é visível a cada sessão de estudo.")}
    {feat("Ofensiva diária","A sequência de dias estudados fica em destaque. Quebrar a sequência dói — e é exatamente esse o mecanismo.")}
    {feat("Missões semanais","Metas rotativas por tipo de ação: responder questões, entregar redação, comparecer. Renovam toda semana.")}
    {feat("Ranking entre colegas","Classificação semanal da turma e da escola, adequada para premiação institucional.")}
    {feat("Pontuação à prova de fraude","Quem concede ponto é o servidor, com valor de tabela, teto diário e bloqueio de repetição. O aluno não consegue inflar a própria pontuação pelo navegador — o que torna o ranking premiável de verdade.")}
  </div>
  <div style="display:flex;flex-direction:column;gap:13px">
    {card("heart","Mascote de estimação","O aluno adota um bichinho que evolui com o estudo. Ele gira em 360°, reage ao toque e ganha nome próprio — que a plataforma lembra mesmo se ele trocar de espécie e voltar depois.","pink")}
    {card("zap","Leve o bastante para rodar em qualquer celular","O mascote é desenhado em camadas vetoriais em vez de motor 3D. Mesma sensação de profundidade, uma fração do peso — decisão tomada pensando em rede móvel de aluno.","cyan")}
    {band("flame","<b>Regra de ouro do sistema:</b> a pontuação nunca cai e afeto não paga ponto. "
         "Ponto vem de estudar — nada além disso.")}
  </div>
</div>''')

# ══════════════════ 11 — ALUNO: CADERNO E ROTINA ══════════════════
slide(head("Aluno · Organização e rotina", "O caderno que entende que assunto puxa assunto",
  "Anotação, planejamento e acompanhamento no mesmo lugar em que o estudo acontece.") + f'''
<div class="grid g3" style="margin-top:2px">
  {card("file","Notas em blocos","Editor por blocos — títulos, listas, tarefas, citações — organizado por matéria, com etiquetas e fixação das notas importantes.","blue")}
  {card("network","Grafo do conhecimento","As notas se referenciam entre si e o sistema desenha o mapa dessas ligações. O aluno vê o próprio conteúdo como rede, não como pilha.","violet")}
  {card("target","Metas pessoais","O aluno define objetivos e acompanha o quanto falta, com o progresso calculado a partir da atividade real.","green")}
  {card("book","Diário de estudo","Registro do que foi estudado e de como foi o dia — insumo para o professor entender o aluno além da nota.","pink")}
  {card("chart","Meu desempenho","Evolução por matéria e por micro-tópico, taxa de acerto e comparação com o próprio histórico.","cyan")}
  {card("calendar","Calendário e agenda","Aulas, provas, entregas e eventos da escola num só calendário, com aviso do que vem a seguir.","amber")}
</div>
{band("network","<b>Por que isso importa comercialmente:</b> caderno, metas e diário são o que mantêm o aluno "
     "dentro da plataforma nos dias em que ele não tem prova — e é a frequência de uso que sustenta a renovação.")}''')

# ══════════════════ 12 — ALUNO: VIDA ESCOLAR ══════════════════
slide(head("Aluno · Vida escolar", "Tudo o que hoje exige ir até a secretaria",
  "Documento, presença, boletim e matrícula resolvidos pelo celular, com registro dos dois lados.") + f'''
<div class="grid g4" style="margin-top:2px">
  {card("check","Presença por código","Código exibido na sala, digitado pelo aluno, com confirmação explícita de aviso antifraude e janela de validade curta.","cyan")}
  {card("cap","Boletim","Notas por etapa e por disciplina, publicadas só depois de aprovadas pela coordenação.","green")}
  {card("upload","Envio de documentos","Checklist do que falta entregar e envio pelo celular, com status acompanhável.","blue")}
  {card("wallet","Simulador de isenção","O candidato descobre em segundos se tem direito ao benefício, sem ocupar atendimento presencial.","amber")}
  {card("compass","Trilhas e aulas","Percurso de estudo com módulos, vídeos e materiais, liberados conforme o avanço.","violet")}
  {card("video","Aulas ao vivo","Transmissão com sala, chat e disponibilização da gravação para quem não pôde assistir.","pink")}
  {card("message","Fórum e dúvidas","Fórum por assunto e conversa direta com o professor, com moderação e histórico.","blue")}
  {card("folder","Biblioteca e materiais","Livros, apostilas e materiais de aula organizados e acessíveis de qualquer aparelho.","green")}
</div>''')

# ══════════════════ 13 — PROFESSOR ══════════════════
slide(head("Perfil 02 de 05 · Professor", "Menos trabalho braçal, mais tempo de aula",
  "O professor entra para ensinar e sair — não para digitar nota em planilha até meia-noite.") + f'''
<div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:2px">
  <div class="feats">
    {feat("Correção assistida de redação e simulado","Chega pronta para revisão. O professor confirma, ajusta e devolve — em uma fração do tempo anterior.")}
    {feat("Banco de questões","Cria, edita e reaproveita questões próprias, com texto de apoio, imagem e resolução comentada, classificadas por assunto.")}
    {feat("Importação inteligente de prova","Sobe o PDF da prova, a IA estrutura as questões e o professor só revisa. Acervo montado em minutos, não em semanas de digitação.")}
    {feat("Trilhas, materiais e biblioteca","Monta o percurso de estudo, publica material e organiza o acervo da disciplina.")}
    {feat("Chamada e calendário da turma","Registro de presença por aula e agenda da turma sempre visível para o aluno.")}
    {feat("Mural de avisos e conversa direta","Comunicado para a turma e canal individual com o aluno, com histórico preservado.")}
  </div>
  <div style="display:flex;flex-direction:column;gap:13px">
    {card("chart","Painel analítico da turma","Taxa de acerto por matéria e por micro-tópico, evolução no tempo e comparação entre turmas. O professor vê qual conteúdo a turma não aprendeu antes da prova — não depois.","blue")}
    {card("alert","Lista de alunos em risco","O sistema aponta quem parou de acessar, quem despencou de desempenho e quem sumiu da chamada. Intervenção pedagógica deixa de depender de percepção.","amber")}
    {card("video","Aulas ao vivo e ranking por prova","Agenda a transmissão, acompanha a sala e publica o desempenho comparado de cada aplicação de prova.","violet")}
  </div>
</div>''')

# ══════════════════ 14 — SECRETARIA ══════════════════
slide(head("Perfil 03 de 05 · Secretaria", "A operação inteira em um painel",
  "Matrícula, documento, presença, boletim e pagamento de professor deixam de morar em pastas soltas.") + f'''
<div class="grid g4" style="margin-top:2px">
  {card("users","Diretório de alunos","Cadastro completo, situação de matrícula, contato e histórico de atendimento em busca única.","blue")}
  {card("file","Emissão de documentos","Declaração de matrícula, comprovante e recibo gerados no padrão da instituição, prontos para impressão.","violet")}
  {card("folder","Documentos recebidos","Fila de conferência do que os alunos enviaram, com aprovação, recusa e pendência sinalizada.","cyan")}
  {card("check","Frequência e chamada","Registro por turma e por dia, com relatório de faltas para contato com a família.","green")}
  {card("upload","Importação em massa","Boletins e resultados de simulado entram por planilha, com validação e aprovação antes de publicar.","amber")}
  {card("wallet","Financeiro de professores","Valor por mês, por hora ou por aula, controle do que foi pago e do que está pendente, com recibo emitido.","pink")}
  {card("chart","Painel de indicadores","Matrículas, presença, documentos pendentes e ocupação de turma em números atualizados.","blue")}
  {card("bell","Comunicados e calendário","Aviso para toda a base ou para turma específica, e calendário escolar oficial num só lugar.","violet")}
</div>
{band("clock","<b>O ganho é de hora útil:</b> tarefas que consumiam a manhã da secretaria — emitir declaração, "
     "conferir documento, lançar boletim, fechar pagamento — passam a ser fluxo de poucos cliques, com trilha do que foi feito.")}''')

# ══════════════════ 15 — GESTÃO ══════════════════
slide(head("Perfil 04 de 05 · Gestão", "Decisão com número, não com impressão",
  "O painel executivo responde as três perguntas que costumam ficar sem resposta na rede de ensino.") + f'''
<div class="grid g3" style="margin-top:2px">
  {card("gauge","Quantos alunos realmente usam?","Funil completo: quem nunca entrou, quem entrou uma vez, quem está ativo na semana e quem já respondeu questão. Adoção medida, não estimada.","blue")}
  {card("eye","Quais telas ninguém abre?","Uso por tela e por perfil. Módulo que não é usado vira decisão: treinar a equipe, ajustar o produto ou desligar.","violet")}
  {card("alert","O que está falhando agora?","Erros de uso são registrados e exibidos em painel. Defeito silencioso deixa de ser descoberto por acaso, meses depois.","amber")}
  {card("users","Governança de usuários","Criação, edição e desligamento de contas, com papéis bem separados e regra que impede duplicidade de cadastro.","cyan")}
  {card("shield","Moderação e auditoria","Moderação de fórum e auditoria de conversas — proteção real numa base com menores de idade.","green")}
  {card("check","Aprovação em duas etapas","Boletim e trilha de aprendizado só ficam visíveis ao aluno depois de aprovados por quem tem competência para isso.","pink")}
</div>
{band("chart","<b>Para a mantenedora:</b> os mesmos indicadores consolidam várias unidades, permitindo comparar "
     "escolas da rede sob os mesmos critérios — engajamento, desempenho, presença e evasão.")}''')

# ══════════════════ 16 — RESPONSÁVEL ══════════════════
slide(f'''
<div style="display:flex;gap:60px;align-items:center;height:100%">
  <div style="flex:1">
    <div class="kicker" style="color:#7FA9FF">Perfil 05 de 05 · Responsável</div>
    <h2 style="margin-top:14px;max-width:520px">A família acompanha<br>
      <span class="grad">sem virar mais um login</span></h2>
    <p class="lead" style="margin-top:20px;color:#AEBBD8;max-width:520px">
      Pai e mãe não querem instalar aplicativo, criar senha e esquecer a senha. Querem saber
      se o filho está estudando. A plataforma entrega exatamente isso, por um link seguro
      e individual — sem cadastro, sem senha, sem acesso a nada além do necessário.</p>
    {band("lock","<b>Privacidade por desenho:</b> o link dá acesso apenas aos indicadores de engajamento "
         "daquele aluno. Nenhum dado de terceiros, nenhuma navegação lateral, revogável a qualquer momento.")}
  </div>
  <div style="flex:.85;display:flex;flex-direction:column;gap:13px">
    {card("flame","Ofensiva de estudo","Há quantos dias seguidos o filho está estudando de verdade.","amber")}
    {card("trophy","Evolução acumulada","Pontuação e progressão, no formato que a família entende em cinco segundos.","cyan")}
    {card("check","Volume de exercícios","Quantas questões já foram respondidas ao longo da preparação.","green")}
    {card("clock","Último acesso","Quando o aluno usou a plataforma pela última vez — o sinal mais honesto que existe.","violet")}
  </div>
</div>''', dark=True, mesh=True)

# ══════════════════ 17 — ACESSIBILIDADE ══════════════════
slide(head("Alcance", "Feita para o aluno que a escola realmente tem",
  "Aparelho modesto, internet instável, primeiro contato com plataforma de estudo. O produto foi desenhado a partir daí.") + f'''
<div class="grid g3" style="margin-top:2px">
  {card("phone","Instala como aplicativo","O aluno adiciona à tela inicial no Android ou no iPhone e abre como app, com ícone próprio e abertura direta no painel.","blue")}
  {card("bell","Notificação que chega","Lembrete de estudo, aviso de aula e recado da escola chegam como notificação no aparelho, não como e-mail ignorado.","violet")}
  {card("zap","Tolerante a rede ruim","As telas carregam por partes e nunca ficam presas esperando imagem. Em 3G instável a plataforma continua utilizável.","cyan")}
  {card("access","Recursos de acessibilidade","Tradução para Língua Brasileira de Sinais e ajustes de leitura embutidos em todas as páginas.","green")}
  {card("users","Primeiro acesso guiado","O aluno descobre o próprio login pelo nome, faz o primeiro acesso assistido e é levado por um tour pelas telas principais.","amber")}
  {card("lock","Recuperação de senha por SMS","Sem depender de e-mail, que boa parte dos alunos não usa: código enviado ao celular já cadastrado, com a secretaria como alternativa presencial.","pink")}
</div>
{band("access","<b>Inclusão não é item de checklist aqui.</b> Cada uma dessas decisões nasceu de um problema real "
     "de uso — aluno sem e-mail, sem aparelho bom, sem rede estável — e não de uma lista de requisitos de edital.")}''')

# ══════════════════ 18 — SEGURANÇA ══════════════════
slide(head("Segurança e conformidade", "Base com dado de menor de idade exige outro nível de rigor",
  "A plataforma foi submetida a auditoria de segurança, com correções aplicadas, versionadas e reexecutáveis.") + f'''
<div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:2px">
  <div class="feats">
    {feat("Isolamento no próprio banco de dados","Cada linha é protegida por política de acesso dentro do banco. Não é o aplicativo que decide o que você pode ver — é o banco, por baixo de qualquer caminho de acesso.")}
    {feat("Autorização checada no servidor","Toda operação sensível valida a sessão real de quem pediu e o papel registrado no servidor. Nada é liberado por informação vinda do navegador.")}
    {feat("Bloqueio de escalada de privilégio","Regra no banco impede que uma conta comum altere o próprio papel para administrador — falha clássica, aqui fechada em nível estrutural.")}
    {feat("Trilha de auditoria","Conversas, moderação e ações administrativas ficam registradas e consultáveis por quem tem competência para isso.")}
  </div>
  <div style="display:flex;flex-direction:column;gap:13px">
    {card("lock","Minimização de dados","A recuperação de acesso foi desenhada para não exigir documento de identidade civil. Coleta-se o mínimo necessário — princípio direto da lei de proteção de dados.","green")}
    {card("shield","Proteção contra abuso","Limite de tentativas por origem, links de convite assinados e com validade, tratamento seguro de conteúdo exibido e validação de redirecionamentos.","blue")}
    {card("check","Processo, não evento","O histórico de auditorias e correções é versionado junto ao código. Segurança aqui é rotina de manutenção, não certificado emoldurado na parede.","violet")}
  </div>
</div>''')

# ══════════════════ 19 — ARQUITETURA ══════════════════
slide(f'''
<div class="kicker">Tecnologia</div>
<h2 style="margin-top:12px;max-width:900px">Sua marca na frente.<br>
<span class="grad">Infraestrutura madura por trás.</span></h2>
<p class="lead" style="margin-top:14px;max-width:840px;color:#AEBBD8">
  A plataforma é entregue como serviço, com endereço, identidade visual e dados próprios
  da sua instituição — sem que ninguém precise manter servidor.</p>
<div class="grid g4" style="margin-top:30px">
  {card("globe","Endereço próprio","Sua instituição acessa por subdomínio dedicado, com logotipo, cores e nome aplicados em todo o sistema.","blue")}
  {card("database","Dados isolados","Cada instituição enxerga apenas a própria base. Isolamento aplicado na camada de dados, não só na interface.","violet")}
  {card("zap","Escala sob demanda","Infraestrutura gerenciada e distribuída: mil alunos simultâneos em semana de simulado não exigem obra no servidor.","cyan")}
  {card("shield","Continuidade garantida","Banco gerenciado com backup, histórico de alterações versionado e atualização contínua do produto para todos os clientes.","green")}
</div>
<div class="chips" style="margin-top:26px">
  <span class="chip">Aplicação web moderna</span>
  <span class="chip">Banco relacional gerenciado</span>
  <span class="chip">Inteligência artificial integrada</span>
  <span class="chip">Aplicativo instalável</span>
  <span class="chip">Notificação push</span>
  <span class="chip">Envio de SMS</span>
  <span class="chip">Vídeo e transmissão ao vivo</span>
  <span class="chip">Importação de provas oficiais</span>
</div>''', dark=True, mesh=True)

# ══════════════════ 20 — COMPARATIVO ══════════════════
def mk(kind):
    p = {"yes":'m4 12 5.5 5.5L20 7', "no":'M6 6l12 12M18 6 6 18', "part":'M5 12h14'}[kind]
    return f'<span class="mk {kind}"><svg viewBox="0 0 24 24" stroke="currentColor"><path d="{p}"/></svg></span>'

rows = [
 ("Conteúdo e banco de questões", "part", "Acervo genérico, sem contexto local", "yes", "Provas oficiais importadas + acervo autoral da escola"),
 ("Correção de redação", "no", "Manual, semanas de espera", "yes", "Cinco competências em minutos, com revisão do professor"),
 ("Diagnóstico por habilidade", "no", "Nota bruta em planilha", "yes", "Desempenho por micro-tópico e nota estatística no padrão do exame"),
 ("Engajamento do aluno", "no", "Depende de cobrança do professor", "yes", "Progressão, ofensiva, missões e ranking à prova de fraude"),
 ("Gestão da secretaria", "part", "Sistema separado, sem integração", "yes", "Matrícula, documento, boletim e financeiro na mesma base"),
 ("Visão de evasão", "no", "Descoberta tardia", "yes", "Aluno em risco e funil de uso em painel"),
 ("Marca da instituição", "part", "Marca do fornecedor em primeiro plano", "yes", "Endereço, logotipo e cores da sua escola"),
]
tbody = ""
for label, a, atxt, b, btxt in rows:
    tbody += (f'<tr><td>{label}</td>'
              f'<td><span class="cf">{mk(a)}<span>{atxt}</span></span></td>'
              f'<td class="hi"><span class="cf">{mk(b)}<span>{btxt}</span></span></td></tr>')

slide(head("Posicionamento", "Por que não é mais um sistema de gestão escolar",
  "A comparação abaixo é com o que a maior parte das escolas usa hoje: um sistema administrativo somado a planilhas e grupos de mensagem.") + f'''
<table style="margin-top:2px">
  <thead><tr>
    <th style="width:24%"></th>
    <th style="width:34%">Sistema administrativo + planilhas</th>
    <th class="hi" style="width:42%">{BRAND}</th>
  </tr></thead>
  <tbody>{tbody}</tbody>
</table>
{band("target","<b>A diferença não é lista de recurso.</b> É que o dado nasce uma única vez e serve "
     "aluno, professor, secretaria e gestão ao mesmo tempo — que é justamente o que a soma de sistemas soltos nunca entrega.")}''')

# ══════════════════ 21 — IMPLANTAÇÃO ══════════════════
slide(head("Implantação", "Da assinatura à turma usando, sem parar a escola",
  "O processo é incremental: cada fase entrega valor sozinha, sem exigir trocar tudo de uma vez.") + f'''
<div class="tl" style="margin-top:16px">
  <div class="step"><div class="num">1</div>
    <h3>Marca e ambiente</h3>
    <p>Subdomínio, logotipo, cores e nome aplicados. A instituição já entra vendo a própria identidade, não a nossa.</p></div>
  <div class="step"><div class="num">2</div>
    <h3>Base e turmas</h3>
    <p>Importação de alunos, professores e turmas a partir das planilhas existentes, com validação e regra que evita cadastro duplicado.</p></div>
  <div class="step"><div class="num">3</div>
    <h3>Conteúdo e avaliação</h3>
    <p>Acervo de questões carregado, provas anteriores importadas e primeiro simulado aplicado dentro da plataforma.</p></div>
  <div class="step"><div class="num">4</div>
    <h3>Operação completa</h3>
    <p>Secretaria, frequência, boletim, financeiro e painéis de gestão em uso, com equipe treinada e acompanhamento de adoção.</p></div>
</div>
<div class="grid g3" style="margin-top:34px">
  {card("users","Treinamento por perfil","Trilha de capacitação separada para professor, secretaria e gestão — cada equipe aprende só o que usa.","blue")}
  {card("gauge","Acompanhamento de adoção","Nas primeiras semanas, o painel de uso mostra quem ainda não entrou, para agir antes da adoção esfriar.","violet")}
  {card("message","Suporte e evolução contínua","Canal de suporte, registro de novidades dentro do produto e melhorias entregues a todos os clientes.","green")}
</div>''')

# ══════════════════ 22 — ENCERRAMENTO ══════════════════
slide(f'''
<div style="position:absolute;left:72px;top:120px;right:72px">
  <div class="kicker" style="color:#7FA9FF">Próximo passo</div>
  <h1 style="margin-top:24px;max-width:900px;font-size:56px">
    Vamos rodar sua escola<br><span class="grad">dentro da plataforma</span>
  </h1>
  <p class="lead" style="margin-top:24px;max-width:660px;color:#B9C6E4;font-size:17.5px">
    A forma mais rápida de avaliar é ver a plataforma com o nome da sua instituição,
    com uma turma real e um simulado de verdade aplicado nela.</p>

  <div class="grid g3" style="margin-top:38px">
    {card("eye","Demonstração guiada","Uma hora percorrendo os cinco perfis, com dados de exemplo e perguntas respondidas ao vivo.","blue")}
    {card("scan","Piloto com turma real","Ambiente com a sua marca, uma turma carregada e um ciclo completo de simulado e redação.","cyan")}
    {card("chart","Proposta sob medida","Escopo, prazo de implantação e investimento calculados pelo porte da instituição.","violet")}
  </div>
</div>
<div style="position:absolute;left:72px;bottom:78px;right:72px;display:flex;justify-content:space-between;align-items:flex-end">
  <div>
    <div style="font-family:Manrope;font-weight:800;font-size:24px;color:#fff;letter-spacing:-.02em">{BRAND}</div>
    <div style="font-size:12.5px;color:#8FA0C4;margin-top:6px">{TAGLINE}</div>
  </div>
  <div style="text-align:right;font-size:12px;color:#7A8BB0;line-height:1.7">
    Contato comercial<br>
    <span style="color:#B9C6E4;font-weight:600">comercial@suaescola.com.br &nbsp;·&nbsp; (00) 00000-0000</span>
  </div>
</div>''', dark=True, mesh=True, no_chrome=True)

# ══════════════════ SAÍDA ══════════════════
html = f'''<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{BRAND} — {TAGLINE}</title>
<link rel="stylesheet" href="style.css">
</head><body>
{"".join(SLIDES)}
</body></html>'''

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
open(out, "w", encoding="utf-8").write(html)
print(f"{len(SLIDES)} slides -> {out}")
