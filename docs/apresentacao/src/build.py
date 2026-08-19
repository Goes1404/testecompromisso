# -*- coding: utf-8 -*-
"""Apresentação comercial da plataforma — A4 retrato (794x1123 px = 210x297 mm)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from icons import ICONS

BRAND = "Plataforma 360"          # nome comercial — trocar aqui muda o documento inteiro
TAGLINE = "Sistema de ensino e gestão escolar"

ICONS["check_min"] = '<path d="m4 12 5.5 5.5L20 7"/>'

# ── paletas: cada página escolhe a sua ────────────────────────────────
PAL = {
 "blue":   dict(c1="#2563EB", c3="#1D4ED8", c2="#EFF4FF", cb="rgba(37,99,235,.18)",  c4="#38BDF8"),
 "indigo": dict(c1="#4F46E5", c3="#4338CA", c2="#F1F0FE", cb="rgba(79,70,229,.18)",  c4="#818CF8"),
 "violet": dict(c1="#7C3AED", c3="#6D28D9", c2="#F6F1FF", cb="rgba(124,58,237,.18)", c4="#C084FC"),
 "cyan":   dict(c1="#0891B2", c3="#0E7490", c2="#ECFBFE", cb="rgba(8,145,178,.20)",  c4="#22D3EE"),
 "teal":   dict(c1="#0D9488", c3="#0F766E", c2="#EBFBF7", cb="rgba(13,148,136,.20)", c4="#2DD4BF"),
 "green":  dict(c1="#059669", c3="#047857", c2="#EAFBF3", cb="rgba(5,150,105,.20)",  c4="#34D399"),
 "amber":  dict(c1="#D97706", c3="#B45309", c2="#FFF6E9", cb="rgba(217,119,6,.22)",  c4="#FBBF24"),
 "rose":   dict(c1="#E11D48", c3="#BE123C", c2="#FFF1F4", cb="rgba(225,29,72,.18)",  c4="#FB7185"),
 "pink":   dict(c1="#DB2777", c3="#BE185D", c2="#FDF1F8", cb="rgba(219,39,119,.18)", c4="#F472B6"),
}
def pal_vars(p):
    d = PAL[p]
    return f'--c1:{d["c1"]};--c2:{d["c2"]};--c3:{d["c3"]};--cb:{d["cb"]};--c4:{d["c4"]}'
def tone_vars(p):
    d = PAL[p]
    return f'--t1:{d["c1"]};--t2:{d["c2"]};--tb:{d["cb"]}'

# ── peças ─────────────────────────────────────────────────────────────
def icon(name, stroke="currentColor"):
    return f'<svg viewBox="0 0 24 24" stroke="{stroke}">{ICONS[name]}</svg>'

def card(name, title, desc, tone="blue", tint=True, hc=False):
    cls = "card tint" if tint else "card"
    if hc: cls += " hc"
    inner = (f'<div class="ico">{icon(name)}</div><div><h3>{title}</h3><p>{desc}</p></div>'
             if hc else f'<div class="ico">{icon(name)}</div><h3>{title}</h3><p>{desc}</p>')
    return f'<div class="{cls}" style="{tone_vars(tone)}">{inner}</div>' 

def feat(title, desc):
    return (f'<div class="feat"><span class="tick">{icon("check_min")}</span>'
            f'<span><b>{title}</b><span>{desc}</span></span></div>')

def stat(n, l, tone="blue"):
    return f'<div class="stat" style="{tone_vars(tone)}"><div class="n">{n}</div><div class="l">{l}</div></div>'

def band(name, html):
    return f'<div class="band"><div class="bi">{icon(name)}</div><p>{html}</p></div>'

def step(n, title, desc, tone="blue"):
    return (f'<div class="step" style="{tone_vars(tone)}"><div class="num">{n}</div>'
            f'<div><h3>{title}</h3><p>{desc}</p></div></div>')

def head(kicker, title, lead=""):
    lead = f'<p class="lead">{lead}</p>' if lead else ""
    return f'<div class="head"><div class="kicker">{kicker}</div><h2>{title}</h2>{lead}</div>'

# ── páginas ───────────────────────────────────────────────────────────
PAGES = []
def page(body, pal="blue", section="", cls="", numbered=True, bg=""):
    n = len(PAGES) + 1
    style = pal_vars(pal) + (f';{bg}' if bg else '')
    foot = ""
    if numbered:
        foot = (f'<div class="foot"><div class="fb"><span class="dot"></span>{BRAND}</div>'
                f'<div class="fs">{section}</div><div class="fn">{n:02d}</div></div>')
    PAGES.append(f'<section class="page {cls}" style="{style}">{body}{foot}</section>')

def content_page(inner, pal="blue", section="", wash=True):
    w = '<div class="wash"></div>' if wash else ''
    page(f'<div class="topbar"></div>{w}<div class="pad">{inner}</div>', pal, section)

# ══════════════ 01 · CAPA ══════════════
page(f'''<div class="topbar"></div>
<div class="pad" style="justify-content:space-between">
  <div style="display:flex;align-items:center;gap:10px">
    <span style="width:11px;height:11px;border-radius:4px;background:linear-gradient(135deg,#3B82F6,#22D3EE)"></span>
    <span style="font-family:Manrope;font-weight:800;font-size:14px;letter-spacing:.02em;color:#fff">{BRAND}</span>
    <span style="margin-left:auto;font-size:10.5px;letter-spacing:.17em;text-transform:uppercase;color:#7E90B8">
      Apresentação institucional · 2026</span>
  </div>

  <div>
    <div style="width:64px;height:5px;border-radius:3px;background:linear-gradient(90deg,#3B82F6,#22D3EE);margin-bottom:30px"></div>
    <h1 style="max-width:640px">Toda a jornada escolar<br>em <span class="grad">uma única plataforma</span></h1>
    <p class="lead" style="margin-top:26px;max-width:560px;font-size:16px;color:#B7C5E3">
      Aprendizado adaptativo, correção de redação por inteligência artificial e gestão
      acadêmica, operacional e financeira — integrados numa só base de dados,
      com a marca da sua instituição.</p>
    <div class="chips" style="margin-top:30px">
      <span class="chip">Aluno</span><span class="chip">Professor</span>
      <span class="chip">Secretaria</span><span class="chip">Gestão</span>
      <span class="chip">Responsável</span>
    </div>
  </div>

  <div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:34px">
      <div style="border-left:2px solid #3B82F6;padding-left:12px">
        <div style="font-family:Manrope;font-weight:800;font-size:24px;color:#fff">93</div>
        <div style="font-size:10.5px;color:#8496BC;margin-top:3px">telas em produção</div></div>
      <div style="border-left:2px solid #22D3EE;padding-left:12px">
        <div style="font-family:Manrope;font-weight:800;font-size:24px;color:#fff">5</div>
        <div style="font-size:10.5px;color:#8496BC;margin-top:3px">perfis de acesso</div></div>
      <div style="border-left:2px solid #A78BFA;padding-left:12px">
        <div style="font-family:Manrope;font-weight:800;font-size:24px;color:#fff">1</div>
        <div style="font-size:10.5px;color:#8496BC;margin-top:3px">base de dados</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;
                border-top:1px solid rgba(255,255,255,.14);padding-top:18px">
      <div>
        <div style="font-family:Manrope;font-weight:800;font-size:19px;color:#fff">{BRAND}</div>
        <div style="font-size:11.5px;color:#8496BC;margin-top:4px">{TAGLINE}</div>
      </div>
      <div style="text-align:right;font-size:9.8px;color:#6E80A8;letter-spacing:.15em;text-transform:uppercase;line-height:1.7">
        Documento confidencial<br>Distribuição restrita</div>
    </div>
  </div>
</div>''', "blue", cls="dark mesh", numbered=False)

# ══════════════ 02 · SUMÁRIO ══════════════
toc = [
 ("03–06", "Panorama", "O cenário atual, a proposta, os números do produto e o mapa de módulos", "blue"),
 ("07–13", "Parte 1 · O aluno", "Estudo e avaliação, redação com IA, mentor, engajamento, caderno e vida escolar", "indigo"),
 ("14–18", "Parte 2 · A equipe", "Professor, secretaria, gestão e o portal do responsável", "violet"),
 ("19–22", "Parte 3 · A plataforma", "Alcance e acessibilidade, segurança e conformidade, arquitetura white-label", "teal"),
 ("23",    "Posicionamento", "Comparativo direto com o que a maior parte das escolas usa hoje", "amber"),
 ("24–25", "Implantação", "As quatro fases da entrada em operação e como avaliar a plataforma", "green"),
]
rows = "".join(
  f'<div class="row" style="{tone_vars(t)}"><span class="rn">{n}</span>'
  f'<div><div class="rt">{ti}</div><div class="rd">{d}</div></div></div>'
  for n, ti, d, t in toc)

content_page(head("Sumário", "O que você vai encontrar<br>neste documento",
  "O material percorre a plataforma pelo caminho de quem a usa: primeiro o aluno, "
  "depois quem sustenta a operação e, por fim, a infraestrutura que segura os dois.") + f'''
<div class="toc grow" style="justify-content:space-evenly">{rows}</div>
{band("compass", "<b>Leitura sugerida:</b> se o seu tempo é curto, as páginas 05, 06 e 23 resumem "
     "dimensão, escopo e posicionamento — o resto do documento é o detalhamento de cada uma delas.")}''',
  "blue", "Sumário")

# ══════════════ 03 · O CENÁRIO ══════════════
content_page(head("Panorama · o cenário atual",
  "A escola já é digital. O que falta<br>é ser <span class=\"gradc\">uma coisa só</span>.",
  "Gestão acadêmica hoje acontece em ferramentas que não se falam. O dado existe — "
  "espalhado em seis lugares, nenhum deles conectado ao outro.") + f'''
<div class="grid g2 grow">
  {card("file","Planilhas para tudo","Notas, presença e cadastro em arquivos paralelos. Duas versões da mesma verdade, e ninguém sabe qual vale.","rose")}
  {card("message","Comunicação em grupo de mensagem","Aviso importante disputa espaço com corrente e figurinha. Sem registro, sem confirmação de leitura, sem histórico.","rose")}
  {card("pen","Redação corrigida à mão","O professor leva duas semanas por turma. O aluno recebe a nota quando já esqueceu o que escreveu.","amber")}
  {card("clock","Simulado que vira PDF morto","A prova é aplicada, o gabarito é conferido, e o desempenho por habilidade nunca chega a ser calculado.","amber")}
  {card("eye","Zero visibilidade de evasão","O gestor descobre que o aluno parou de estudar no dia em que ele não volta mais.","pink")}
  {card("lock","Dado sensível sem controle","Boletim, documento e contato de menor de idade circulando por e-mail e pendrive, sem trilha de auditoria.","pink")}
</div>
{band("alert","<b>O custo não é o software.</b> É a hora de coordenação gasta reconciliando planilha, "
     "o aluno que evade sem sinal de alerta e a decisão pedagógica tomada no achismo.")}''',
  "rose", "Panorama")

# ══════════════ 04 · A PROPOSTA ══════════════
def hub_node(x, y, w, h, title, lines, accent):
    t = f'<text x="{x+17}" y="{y+31}" class="nt">{title}</text>'
    for i, ln in enumerate(lines):
        t += f'<text x="{x+17}" y="{y+53+i*16}" class="nd">{ln}</text>'
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="rgba(255,255,255,.07)" '
            f'stroke="rgba(255,255,255,.16)"/>'
            f'<rect x="{x}" y="{y+14}" width="3.5" height="{h-28}" rx="2" fill="{accent}"/>{t}')

HUB = f'''<svg viewBox="0 0 670 524" style="width:100%;height:auto">
  <defs>
    <linearGradient id="core" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563EB" stop-opacity=".9"/>
      <stop offset="1" stop-color="#7C3AED" stop-opacity=".75"/>
    </linearGradient>
    <linearGradient id="lnv" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#22D3EE" stop-opacity=".55"/>
      <stop offset="1" stop-color="#60A5FA" stop-opacity=".18"/>
    </linearGradient>
    <style>
      .nt{{font-family:Manrope,sans-serif;font-weight:700;font-size:14.5px;fill:#fff}}
      .nd{{font-family:Inter,sans-serif;font-size:11px;fill:#A2B2D4}}
      .ct{{font-family:Manrope,sans-serif;font-weight:800;font-size:20px;fill:#fff;text-anchor:middle}}
      .cd{{font-family:Inter,sans-serif;font-size:11.2px;fill:#D6E2FB;text-anchor:middle}}
    </style>
  </defs>
  <g stroke="url(#lnv)" stroke-width="1.6" fill="none">
    <path d="M250 152 C 250 118, 205 88, 159 88"/>
    <path d="M420 152 C 420 118, 465 88, 511 88"/>
    <path d="M250 262 C 250 296, 205 324, 159 324"/>
    <path d="M420 262 C 420 296, 465 324, 511 324"/>
    <path d="M335 262 V 436"/>
  </g>
  {hub_node(0, 0, 318, 88, "Aluno", ["Estuda, treina redação e acompanha", "o próprio desempenho todo dia"], "#3B82F6")}
  {hub_node(352, 0, 318, 88, "Professor", ["Cria conteúdo, corrige e mede", "a turma por habilidade"], "#8B5CF6")}
  {hub_node(0, 324, 318, 88, "Secretaria", ["Matrícula, documento, frequência,", "boletim e financeiro"], "#06B6D4")}
  {hub_node(352, 324, 318, 88, "Gestão", ["Indicador de rede, aluno em risco,", "moderação e auditoria"], "#F59E0B")}
  {hub_node(176, 436, 318, 88, "Responsável", ["Acompanha o filho por link seguro,", "sem precisar de conta"], "#10B981")}
  <rect x="160" y="152" width="350" height="110" rx="20" fill="url(#core)" stroke="rgba(147,197,253,.45)"/>
  <text class="ct" x="335" y="192">{BRAND}</text>
  <text class="cd" x="335" y="217">Base única de dados · permissão por perfil</text>
  <text class="cd" x="335" y="236">Marca própria · multi-instituição</text>
</svg>'''

page(f'''<div class="topbar"></div>
<div class="pad">
  {head("Panorama · a proposta", "Cinco perfis, um único sistema,<br><span class='grad'>a mesma base de dados</span>",
    "O que o aluno estuda alimenta o painel do professor. O que o professor corrige alimenta o "
    "boletim. O que a secretaria matricula alimenta a chamada. Nada é digitado duas vezes.")}
  <div class="grow" style="display:flex;align-items:center">{HUB}</div>
  {band("network","<b>É essa integração que gera o valor.</b> Um sistema por função devolve quatro "
       "relatórios que não fecham entre si; uma base só devolve uma leitura da escola inteira.")}
</div>
<div class="foot"><div class="fb"><span class="dot"></span>{BRAND}</div>
<div class="fs">Panorama</div><div class="fn">04</div></div>''',
  "blue", cls="dark mesh", numbered=False)

# ══════════════ 05 · NÚMEROS ══════════════
content_page(head("Panorama · dimensão do produto",
  "Uma plataforma madura,<br>não um protótipo",
  "Números da aplicação em produção — a superfície de produto já construída, testada e versionada.") + f'''
<div class="stats">
  {stat("93","telas de sistema entregues, distribuídas entre os cinco perfis","blue")}
  {stat("55","tabelas de dados modelando toda a operação acadêmica","cyan")}
  {stat("38","serviços de back-end para IA, integrações e automações","violet")}
  {stat("110","migrações de banco versionadas, com histórico auditável","amber")}
</div>
<div class="grid g2 grow" style="margin-top:16px">
  {card("phone","Construída para celular","O aluno acessa do aparelho que tem, na rede que tem. Instalável como aplicativo, com tela que carrega antes de a imagem chegar.","cyan")}
  {card("shield","Segurança auditada","Isolamento de dados por usuário direto no banco, auditoria periódica e correções aplicadas e versionadas.","green")}
  {card("globe","Pronta para várias instituições","Cada escola com seu endereço, sua marca, suas cores e seus dados isolados dos demais.","violet")}
  {card("zap","Evolução contínua","Melhorias entregues a todos os clientes ao mesmo tempo, sem projeto de atualização por escola.","indigo")}
</div>
{band("check","<b>Nada aqui é promessa de roadmap.</b> Toda funcionalidade apresentada neste documento "
     "existe como tela em produção, com uso real registrado.")}''',
  "indigo", "Panorama")

# ══════════════ 06 · MAPA DE MÓDULOS ══════════════
content_page(head("Panorama · escopo funcional", "O que está pronto e rodando",
  "Doze módulos em operação, cobrindo da questão respondida pelo aluno ao recibo do professor.") + f'''
<div class="grid g2 grow">
  {card("brain","Simulados & Provas","Prova completa no padrão do exame e nota calculada por TRI.","blue",hc=True)}
  {card("pen","Redação com IA","Cinco competências em minutos, com revisão do professor.","violet",hc=True)}
  {card("sparkles","Mentor de IA","Assistente pedagógico 24 horas, com o contexto da aula.","cyan",hc=True)}
  {card("compass","Trilhas & Aulas","Percurso com módulos, vídeo, material e aprovação.","green",hc=True)}
  {card("video","Aulas ao vivo","Agendamento, sala, chat moderado e gravação publicada.","pink",hc=True)}
  {card("message","Fórum & Atendimento","Fórum por matéria e canal direto de dúvida, auditável.","indigo",hc=True)}
  {card("trophy","Engajamento","Pontos, níveis, ofensiva, missões, conquistas e ranking.","amber",hc=True)}
  {card("network","Caderno & Grafo","Notas em blocos, links entre elas e grafo do conhecimento.","violet",hc=True)}
  {card("check","Frequência","Chamada por código na sala, com barreira antifraude.","cyan",hc=True)}
  {card("cap","Boletim & Notas","Importação em massa, aprovação em duas etapas e boletim.","green",hc=True)}
  {card("wallet","Secretaria & Financeiro","Matrícula, documento, declaração e pagamento de professores.","amber",hc=True)}
  {card("chart","BI & Analytics","Desempenho por micro-tópico, aluno em risco e funil de uso.","blue",hc=True)}
</div>''', "blue", "Panorama")

# ══════════════ DIVISOR DE PARTE ══════════════
def part_page(num, title, lead, items, pal, section):
    d = PAL[pal]
    bg = (f'background:linear-gradient(158deg,{d["c4"]} -20%,{d["c1"]} 38%,'
          f'{d["c3"]} 72%,#101830 108%)')
    rows = "".join(
      f'<div style="display:flex;align-items:center;gap:13px;padding:11px 0;'
      f'border-bottom:1px solid rgba(255,255,255,.20)">'
      f'<span style="font-family:Manrope;font-weight:800;font-size:11.5px;color:#fff;'
      f'background:rgba(255,255,255,.20);border-radius:6px;padding:3px 8px;min-width:30px;text-align:center">{p}</span>'
      f'<span style="font-family:Manrope;font-weight:700;font-size:14px;color:#fff">{t}</span>'
      f'<span style="margin-left:auto;font-size:11.4px;color:rgba(255,255,255,.72);text-align:right;max-width:330px">{d2}</span>'
      f'</div>' for p, t, d2 in items)
    body = f'''<div class="texture"></div>
    <div style="position:absolute;right:44px;top:96px;z-index:2" class="part-no">{num}</div>
    <div class="pad" style="justify-content:space-between">
      <div class="kicker">Parte {num} de 3</div>
      <div>
        <h1 style="font-size:46px;max-width:600px">{title}</h1>
        <p class="lead" style="margin-top:22px;max-width:540px;font-size:15.5px">{lead}</p>
        <div style="margin-top:46px">
          <div style="font-family:Manrope;font-weight:700;font-size:10.6px;letter-spacing:.18em;
                      text-transform:uppercase;color:rgba(255,255,255,.66);margin-bottom:6px">
            Nesta parte</div>
          {rows}
        </div>
      </div>
    </div>'''
    page(body, pal, section, cls="partpage", bg=bg)

part_page(1, "O aluno", 
  "Um ambiente que ele abre por vontade própria: estuda, treina, mede o próprio progresso "
  "e volta no dia seguinte. Engajamento aqui é métrica, não discurso.",
  [("08", "Estudo e avaliação", "Simulados, provas, TRI e repetição espaçada"),
   ("09", "Redação com IA", "Cinco competências corrigidas em minutos"),
   ("10", "Mentor de inteligência artificial", "Assistente pedagógico disponível o tempo todo"),
   ("11", "Engajamento", "Pontuação, ofensiva, missões e ranking"),
   ("12", "Organização e rotina", "Caderno em blocos, grafo, metas e diário"),
   ("13", "Vida escolar", "Presença, boletim, documentos e matrícula")],
  "indigo", "Parte 1 · O aluno")

# ══════════════ 08 · ALUNO / ESTUDO ══════════════
content_page(head("Parte 1 · o aluno", "Da questão solta à nota<br>que significa alguma coisa",
  "O aluno não treina no vazio: cada resposta alimenta o diagnóstico dele e o painel do professor.") + f'''
<div class="feats grow" style="justify-content:space-evenly">
  {feat("Prova completa no padrão do exame","Cronômetro proporcional, navegação por grade, marcação para revisão e correção ao final.")}
  {feat("Simulado por matéria","Blocos curtos por disciplina e micro-tópico, para treinar exatamente o ponto fraco.")}
  {feat("Nota por Teoria de Resposta ao Item","Modelo de três parâmetros com estimação estatística: acertar item difícil pesa mais, chute pesa contra. Nota na escala de 0 a 1000, com faixa de confiança.")}
  {feat("Flashcards com repetição espaçada","O sistema calcula quando cada carta deve voltar. Quem erra revê logo; quem acerta revê depois.")}
  {feat("Desafio diário","Uma questão por dia, com recompensa, para criar rotina em vez de maratona na véspera da prova.")}
  {feat("Explicação em toda questão","Texto de apoio, imagem e resolução comentada — errar vira aula, não só ponto perdido.")}
</div>
<div class="grid g2" style="margin-top:6px">
  {card("database","Banco de questões próprio","Provas oficiais importadas automaticamente e questões autorais da escola no mesmo acervo, classificadas por matéria e micro-tópico.","blue")}
  {card("scan","Prova em PDF vira prova digital","A IA lê o arquivo, separa enunciado, alternativas, gabarito e texto de apoio, e devolve tudo estruturado para revisão do professor.","indigo")}
</div>
{band("gauge","<b>O efeito prático:</b> o aluno descobre o que estudar amanhã sem depender de alguém para dizer.")}''',
  "blue", "Parte 1 · O aluno")

# ══════════════ 09 · ALUNO / REDAÇÃO ══════════════
content_page(head("Parte 1 · o aluno", "Duas semanas de correção<br>viram <span class=\"gradc\">dois minutos</span>",
  "O gargalo mais caro da preparação escolar, resolvido sem tirar o professor da decisão final.") + f'''
<div class="feats grow" style="justify-content:space-evenly">
  {feat("Correções independentes, como em banca real","O sistema roda avaliações paralelas e cegas e aplica o protocolo oficial de discrepância. Divergiu demais entre corretores? Entra uma terceira leitura.")}
  {feat("Cinco competências, escala oficial","Cada competência recebe nota na régua padronizada da matriz de referência. O total é a soma, de 0 a 1000 — sem nota inventada no meio.")}
  {feat("Anulação verificada antes de tudo","Fuga ao tema, tipo textual errado e demais situações de anulação são checadas primeiro, na mesma ordem da banca oficial.")}
  {feat("O professor continua no comando","A correção chega pronta para revisão: ele ajusta nota, escreve comentário e devolve. A IA tira o trabalho braçal, não a autoridade pedagógica.")}
  {feat("Propostas de tema prontas","Temas com textos motivadores gerados para a turma, ou cadastrados pela coordenação.")}
</div>
<div class="grid g2" style="margin-top:6px">
  {card("scan","Foto do papel, direto do celular","O aluno fotografa a redação manuscrita. O sistema transcreve preservando os parágrafos e corrige o texto transcrito — sem punir o aluno por ruído de digitalização.","cyan")}
  {card("pen","Espelho de correção","Os trechos que motivaram cada desconto aparecem destacados dentro do próprio texto. O aluno vê onde errou, não só quanto tirou.","violet")}
</div>
{band("clock","<b>Impacto direto:</b> o aluno escreve mais porque recebe retorno rápido — e o professor "
     "passa a corrigir por amostragem e exceção, no lugar de pilha por pilha.")}''',
  "violet", "Parte 1 · O aluno")

# ══════════════ 10 · ALUNO / MENTOR IA ══════════════
content_page(head("Parte 1 · o aluno", "Um professor particular<br>disponível às três da manhã",
  "A dúvida do aluno não espera o horário de aula. O mentor responde em português, em linguagem "
  "didática, e sabe onde o aluno está dentro da plataforma.") + f'''
<div class="grid g2 grow">
  {card("sparkles","Presente em toda tela","Um botão flutuante acompanha o aluno pelo sistema inteiro. A dúvida é resolvida onde ela nasce, sem trocar de aplicativo.","cyan")}
  {card("compass","Consciente do contexto","Dentro da aula, o mentor já sabe qual unidade está sendo estudada e responde sobre aquele conteúdo — não sobre o assunto genérico.","indigo")}
  {card("heart","Com a cara do aluno","O assistente assume o rosto do mascote que o aluno adotou. Detalhe pequeno, efeito grande sobre quem tem 16 anos e não pede ajuda a adulto.","pink")}
  {card("target","Sugestão de próximo passo","A partir do histórico de acertos e erros, o sistema aponta o que estudar em seguida, em vez de deixar o aluno escolher no escuro.","blue")}
  {card("shield","Limites definidos","Em assunto administrativo — prazo, documento, isenção — o mentor orienta procurar a secretaria em vez de inventar resposta.","green")}
  {card("message","Sem substituir gente","Quando a dúvida passa do ponto, o aluno abre conversa com o professor de verdade, dentro da mesma tela.","amber")}
</div>
{band("sparkles","<b>Por que isso vende:</b> é o recurso que o aluno mostra para o colega. "
     "Custa pouco por aluno e é o que diferencia a plataforma de um repositório de PDF.")}''',
  "cyan", "Parte 1 · O aluno")

# ══════════════ 11 · ALUNO / ENGAJAMENTO ══════════════
content_page(head("Parte 1 · o aluno", "O problema não é ensinar.<br>É fazer voltar amanhã.",
  "Sistema de progressão desenhado para criar hábito diário — e blindado contra quem tenta burlar.") + f'''
<div class="feats grow" style="justify-content:space-evenly">
  {feat("Pontuação, níveis e conquistas","Sete níveis de progressão e conquistas por marco atingido. O avanço é visível a cada sessão de estudo.")}
  {feat("Ofensiva diária","A sequência de dias estudados fica em destaque. Quebrar a sequência dói — e é exatamente esse o mecanismo.")}
  {feat("Missões semanais","Metas rotativas por tipo de ação: responder questões, entregar redação, comparecer. Renovam toda semana.")}
  {feat("Ranking entre colegas","Classificação semanal da turma e da escola, adequada para premiação institucional.")}
  {feat("Pontuação à prova de fraude","Quem concede ponto é o servidor, com valor de tabela, teto diário e bloqueio de repetição. O aluno não consegue inflar a própria pontuação pelo navegador — o que torna o ranking premiável de verdade.")}
</div>
<div class="grid g2" style="margin-top:6px">
  {card("heart","Mascote de estimação","O aluno adota um bichinho que evolui com o estudo. Gira em 360°, reage ao toque e ganha nome próprio — que a plataforma lembra mesmo se ele trocar de espécie e voltar depois.","pink")}
  {card("zap","Leve para qualquer celular","O mascote é desenhado em camadas vetoriais em vez de motor 3D. Mesma sensação de profundidade, uma fração do peso — decisão tomada pensando em rede móvel de aluno.","cyan")}
</div>
{band("flame","<b>Regra de ouro do sistema:</b> a pontuação nunca cai e afeto não paga ponto. "
     "Ponto vem de estudar — nada além disso.")}''',
  "amber", "Parte 1 · O aluno")

# ══════════════ 12 · ALUNO / CADERNO ══════════════
content_page(head("Parte 1 · o aluno", "O caderno que entende<br>que assunto puxa assunto",
  "Anotação, planejamento e acompanhamento no mesmo lugar em que o estudo acontece.") + f'''
<div class="grid g2 grow">
  {card("file","Notas em blocos","Editor por blocos — títulos, listas, tarefas, citações — organizado por matéria, com etiquetas e fixação das notas importantes.","indigo")}
  {card("network","Grafo do conhecimento","As notas se referenciam entre si e o sistema desenha o mapa dessas ligações. O aluno vê o próprio conteúdo como rede, não como pilha.","violet")}
  {card("target","Metas pessoais","O aluno define objetivos e acompanha o quanto falta, com o progresso calculado a partir da atividade real.","green")}
  {card("book","Diário de estudo","Registro do que foi estudado e de como foi o dia — insumo para o professor entender o aluno além da nota.","pink")}
  {card("chart","Meu desempenho","Evolução por matéria e por micro-tópico, taxa de acerto e comparação com o próprio histórico.","cyan")}
  {card("calendar","Calendário e agenda","Aulas, provas, entregas e eventos da escola num só calendário, com aviso do que vem a seguir.","amber")}
</div>
{band("network","<b>Por que isso importa comercialmente:</b> caderno, metas e diário são o que mantêm o aluno "
     "dentro da plataforma nos dias em que ele não tem prova — e é a frequência de uso que sustenta a renovação.")}''',
  "indigo", "Parte 1 · O aluno")

# ══════════════ 13 · ALUNO / VIDA ESCOLAR ══════════════
content_page(head("Parte 1 · o aluno", "Tudo o que hoje exige<br>ir até a secretaria",
  "Documento, presença, boletim e matrícula resolvidos pelo celular, com registro dos dois lados.") + f'''
<div class="grid g2 grow">
  {card("check","Presença por código","Código exibido na sala e digitado pelo aluno, com confirmação explícita de aviso antifraude e janela de validade curta.","cyan")}
  {card("cap","Boletim","Notas por etapa e por disciplina, publicadas só depois de aprovadas pela coordenação.","green")}
  {card("upload","Envio de documentos","Checklist do que falta entregar e envio pelo celular, com status acompanhável.","blue")}
  {card("wallet","Simulador de isenção","O candidato descobre em segundos se tem direito ao benefício, sem ocupar atendimento presencial.","amber")}
  {card("compass","Trilhas e aulas","Percurso de estudo com módulos, vídeos e materiais, liberados conforme o avanço.","violet")}
  {card("video","Aulas ao vivo","Transmissão com sala, chat e disponibilização da gravação para quem não pôde assistir.","pink")}
  {card("message","Fórum e dúvidas","Fórum por assunto e conversa direta com o professor, com moderação e histórico.","indigo")}
  {card("folder","Biblioteca e materiais","Livros, apostilas e materiais de aula organizados e acessíveis de qualquer aparelho.","teal")}
</div>''', "teal", "Parte 1 · O aluno")

# ══════════════ DIVISOR PARTE 2 ══════════════
part_page(2, "A equipe",
  "Professor, secretaria e gestão trabalham sobre o mesmo dado que o aluno produz. "
  "Nenhum deles precisa digitar de novo o que o outro já registrou.",
  [("15", "Professor", "Correção assistida, banco de questões e analítico de turma"),
   ("16", "Secretaria", "Matrícula, documento, frequência, boletim e financeiro"),
   ("17", "Gestão", "Adoção, evasão, moderação e auditoria"),
   ("18", "Responsável", "Acompanhamento da família por link seguro")],
  "violet", "Parte 2 · A equipe")

# ══════════════ 15 · PROFESSOR ══════════════
content_page(head("Parte 2 · a equipe · professor", "Menos trabalho braçal,<br>mais tempo de aula",
  "O professor entra para ensinar e sair — não para digitar nota em planilha até meia-noite.") + f'''
<div class="feats grow" style="justify-content:space-evenly">
  {feat("Correção assistida de redação e simulado","Chega pronta para revisão. O professor confirma, ajusta e devolve — em uma fração do tempo anterior.")}
  {feat("Banco de questões","Cria, edita e reaproveita questões próprias, com texto de apoio, imagem e resolução comentada, classificadas por assunto.")}
  {feat("Importação inteligente de prova","Sobe o PDF da prova, a IA estrutura as questões e o professor só revisa. Acervo montado em minutos, não em semanas de digitação.")}
  {feat("Trilhas, materiais e biblioteca","Monta o percurso de estudo, publica material e organiza o acervo da disciplina.")}
  {feat("Chamada e calendário da turma","Registro de presença por aula e agenda da turma sempre visível para o aluno.")}
  {feat("Mural de avisos e conversa direta","Comunicado para a turma e canal individual com o aluno, com histórico preservado.")}
</div>
<div class="grid g2" style="margin-top:6px">
  {card("chart","Painel analítico da turma","Taxa de acerto por matéria e por micro-tópico, evolução no tempo e comparação entre turmas. O professor vê o que a turma não aprendeu antes da prova — não depois.","violet")}
  {card("alert","Lista de alunos em risco","O sistema aponta quem parou de acessar, quem despencou de desempenho e quem sumiu da chamada. Intervenção pedagógica deixa de depender de percepção.","amber")}
</div>''', "violet", "Parte 2 · A equipe")

# ══════════════ 16 · SECRETARIA ══════════════
content_page(head("Parte 2 · a equipe · secretaria", "A operação inteira<br>em um painel",
  "Matrícula, documento, presença, boletim e pagamento de professor deixam de morar em pastas soltas.") + f'''
<div class="grid g2 grow">
  {card("users","Diretório de alunos","Cadastro completo, situação de matrícula, contato e histórico de atendimento em busca única.","blue")}
  {card("file","Emissão de documentos","Declaração de matrícula, comprovante e recibo gerados no padrão da instituição, prontos para impressão.","violet")}
  {card("folder","Documentos recebidos","Fila de conferência do que os alunos enviaram, com aprovação, recusa e pendência sinalizada.","cyan")}
  {card("check","Frequência e chamada","Registro por turma e por dia, com relatório de faltas para contato com a família.","green")}
  {card("upload","Importação em massa","Boletins e resultados de simulado entram por planilha, com validação e aprovação antes de publicar.","amber")}
  {card("wallet","Financeiro de professores","Valor por mês, por hora ou por aula, controle do que foi pago e do que está pendente, com recibo emitido.","pink")}
  {card("chart","Painel de indicadores","Matrículas, presença, documentos pendentes e ocupação de turma em números atualizados.","indigo")}
  {card("bell","Comunicados e calendário","Aviso para toda a base ou para turma específica, e calendário escolar oficial num só lugar.","teal")}
</div>
{band("clock","<b>O ganho é de hora útil:</b> tarefas que consumiam a manhã da secretaria — emitir declaração, "
     "conferir documento, lançar boletim, fechar pagamento — viram fluxo de poucos cliques, com trilha do que foi feito.")}''',
  "cyan", "Parte 2 · A equipe")

# ══════════════ 17 · GESTÃO ══════════════
content_page(head("Parte 2 · a equipe · gestão", "Decisão com número,<br>não com impressão",
  "O painel executivo responde as três perguntas que costumam ficar sem resposta na rede de ensino.") + f'''
<div class="grid g2 grow">
  {card("gauge","Quantos alunos realmente usam?","Funil completo: quem nunca entrou, quem entrou uma vez, quem está ativo na semana e quem já respondeu questão. Adoção medida, não estimada.","blue")}
  {card("eye","Quais telas ninguém abre?","Uso por tela e por perfil. Módulo que não é usado vira decisão: treinar a equipe, ajustar o produto ou desligar.","violet")}
  {card("alert","O que está falhando agora?","Erros de uso são registrados e exibidos em painel. Defeito silencioso deixa de ser descoberto por acaso, meses depois.","amber")}
  {card("users","Governança de usuários","Criação, edição e desligamento de contas, com papéis bem separados e regra que impede duplicidade de cadastro.","cyan")}
  {card("shield","Moderação e auditoria","Moderação de fórum e auditoria de conversas — proteção real numa base com menores de idade.","green")}
  {card("check","Aprovação em duas etapas","Boletim e trilha de aprendizado só ficam visíveis ao aluno depois de aprovados por quem tem competência para isso.","pink")}
</div>
{band("chart","<b>Para a mantenedora:</b> os mesmos indicadores consolidam várias unidades, permitindo comparar "
     "escolas da rede sob os mesmos critérios — engajamento, desempenho, presença e evasão.")}''',
  "amber", "Parte 2 · A equipe")

# ══════════════ 18 · RESPONSÁVEL ══════════════
content_page(head("Parte 2 · a equipe · responsável", "A família acompanha<br>sem virar mais um login",
  "Pai e mãe não querem instalar aplicativo, criar senha e esquecer a senha. Querem saber se o filho "
  "está estudando. A plataforma entrega exatamente isso, por um link seguro e individual — sem cadastro, "
  "sem senha, sem acesso a nada além do necessário.") + f'''
<div class="grid g2 grow">
  {card("flame","Ofensiva de estudo","Há quantos dias seguidos o filho está estudando de verdade.","amber")}
  {card("trophy","Evolução acumulada","Pontuação e progressão, no formato que a família entende em cinco segundos.","cyan")}
  {card("check","Volume de exercícios","Quantas questões já foram respondidas ao longo da preparação.","green")}
  {card("clock","Último acesso","Quando o aluno usou a plataforma pela última vez — o sinal mais honesto que existe.","violet")}
</div>
{band("lock","<b>Privacidade por desenho:</b> o link dá acesso apenas aos indicadores de engajamento daquele "
     "aluno. Nenhum dado de terceiros, nenhuma navegação lateral, revogável a qualquer momento.")}''',
  "green", "Parte 2 · A equipe")

# ══════════════ DIVISOR PARTE 3 ══════════════
part_page(3, "A plataforma",
  "O que sustenta os dois lados: alcance para o aluno que tem aparelho modesto, segurança "
  "para uma base com menores de idade e uma arquitetura que aceita a sua marca na frente.",
  [("20", "Alcance e acessibilidade", "Aplicativo instalável, rede ruim e inclusão"),
   ("21", "Segurança e conformidade", "Isolamento no banco, auditoria e minimização de dados"),
   ("22", "Arquitetura e marca própria", "Endereço, identidade e dados isolados por instituição")],
  "teal", "Parte 3 · A plataforma")

# ══════════════ 20 · ALCANCE ══════════════
content_page(head("Parte 3 · a plataforma", "Feita para o aluno<br>que a escola realmente tem",
  "Aparelho modesto, internet instável, primeiro contato com plataforma de estudo. "
  "O produto foi desenhado a partir daí.") + f'''
<div class="grid g2 grow">
  {card("phone","Instala como aplicativo","O aluno adiciona à tela inicial no Android ou no iPhone e abre como app, com ícone próprio e abertura direta no painel.","blue")}
  {card("bell","Notificação que chega","Lembrete de estudo, aviso de aula e recado da escola chegam como notificação no aparelho, não como e-mail ignorado.","violet")}
  {card("zap","Tolerante a rede ruim","As telas carregam por partes e nunca ficam presas esperando imagem. Em rede móvel instável a plataforma continua utilizável.","cyan")}
  {card("access","Recursos de acessibilidade","Tradução para Língua Brasileira de Sinais e ajustes de leitura embutidos em todas as páginas.","green")}
  {card("users","Primeiro acesso guiado","O aluno descobre o próprio login pelo nome, faz o primeiro acesso assistido e é levado por um tour pelas telas principais.","amber")}
  {card("lock","Recuperação de senha por SMS","Sem depender de e-mail, que boa parte dos alunos não usa: código enviado ao celular já cadastrado, com a secretaria como alternativa presencial.","pink")}
</div>
{band("access","<b>Inclusão não é item de checklist aqui.</b> Cada uma dessas decisões nasceu de um problema real "
     "de uso — aluno sem e-mail, sem aparelho bom, sem rede estável — e não de uma lista de requisitos de edital.")}''',
  "teal", "Parte 3 · A plataforma")

# ══════════════ 21 · SEGURANÇA ══════════════
content_page(head("Parte 3 · a plataforma", "Base com dado de menor de idade<br>exige outro nível de rigor",
  "A plataforma foi submetida a auditoria de segurança, com correções aplicadas, versionadas e reexecutáveis.") + f'''
<div class="feats grow" style="justify-content:space-evenly">
  {feat("Isolamento no próprio banco de dados","Cada linha é protegida por política de acesso dentro do banco. Não é o aplicativo que decide o que você pode ver — é o banco, por baixo de qualquer caminho de acesso.")}
  {feat("Autorização checada no servidor","Toda operação sensível valida a sessão real de quem pediu e o papel registrado no servidor. Nada é liberado por informação vinda do navegador.")}
  {feat("Bloqueio de escalada de privilégio","Regra no banco impede que uma conta comum altere o próprio papel para administrador — falha clássica, aqui fechada em nível estrutural.")}
  {feat("Trilha de auditoria","Conversas, moderação e ações administrativas ficam registradas e consultáveis por quem tem competência para isso.")}
</div>
<div class="grid g2" style="margin-top:6px">
  {card("lock","Minimização de dados","A recuperação de acesso foi desenhada para não exigir documento de identidade civil. Coleta-se o mínimo necessário — princípio direto da lei de proteção de dados.","green")}
  {card("shield","Proteção contra abuso","Limite de tentativas por origem, links de convite assinados e com validade, tratamento seguro de conteúdo exibido e validação de redirecionamentos.","teal")}
</div>
{band("check","<b>Segurança aqui é processo, não evento.</b> O histórico de auditorias e correções é versionado "
     "junto ao código, e não um certificado emoldurado na parede.")}''',
  "green", "Parte 3 · A plataforma")

# ══════════════ 22 · ARQUITETURA ══════════════
content_page(head("Parte 3 · a plataforma", "Sua marca na frente.<br>Infraestrutura madura por trás.",
  "A plataforma é entregue como serviço, com endereço, identidade visual e dados próprios da sua "
  "instituição — sem que ninguém precise manter servidor.") + f'''
<div class="grid g2 grow">
  {card("globe","Endereço próprio","Sua instituição acessa por subdomínio dedicado, com logotipo, cores e nome aplicados em todo o sistema.","blue")}
  {card("database","Dados isolados","Cada instituição enxerga apenas a própria base. Isolamento aplicado na camada de dados, não só na interface.","violet")}
  {card("zap","Escala sob demanda","Infraestrutura gerenciada e distribuída: mil alunos simultâneos em semana de simulado não exigem obra no servidor.","cyan")}
  {card("shield","Continuidade garantida","Banco gerenciado com backup, histórico de alterações versionado e atualização contínua do produto para todos os clientes.","green")}
</div>
<div style="margin-top:16px">
  <div class="kicker" style="margin-bottom:12px">Integrações e recursos de base</div>
  <div class="chips">
    <span class="chip">Aplicação web moderna</span><span class="chip">Banco relacional gerenciado</span>
    <span class="chip">Inteligência artificial integrada</span><span class="chip">Aplicativo instalável</span>
    <span class="chip">Notificação push</span><span class="chip">Envio de SMS</span>
    <span class="chip">Vídeo e transmissão ao vivo</span><span class="chip">Importação de provas oficiais</span>
  </div>
</div>''', "indigo", "Parte 3 · A plataforma")

# ══════════════ 23 · POSICIONAMENTO ══════════════
def mk(kind):
    p = {"yes":'m4 12 5.5 5.5L20 7', "no":'M6 6l12 12M18 6 6 18', "part":'M5 12h14'}[kind]
    return f'<span class="mk {kind}"><svg viewBox="0 0 24 24" stroke="currentColor"><path d="{p}"/></svg></span>'

rows_cmp = [
 ("Conteúdo e banco de questões", "part", "Acervo genérico, sem contexto local", "yes", "Provas oficiais importadas somadas ao acervo autoral da escola"),
 ("Correção de redação", "no", "Manual, semanas de espera", "yes", "Cinco competências em minutos, com revisão do professor"),
 ("Diagnóstico por habilidade", "no", "Nota bruta em planilha", "yes", "Desempenho por micro-tópico e nota estatística no padrão do exame"),
 ("Engajamento do aluno", "no", "Depende de cobrança do professor", "yes", "Progressão, ofensiva, missões e ranking à prova de fraude"),
 ("Gestão da secretaria", "part", "Sistema separado, sem integração", "yes", "Matrícula, documento, boletim e financeiro na mesma base"),
 ("Visão de evasão", "no", "Descoberta tardia", "yes", "Aluno em risco e funil de uso em painel"),
 ("Acompanhamento da família", "part", "Boletim impresso na reunião", "yes", "Link seguro com engajamento atualizado"),
 ("Marca da instituição", "part", "Marca do fornecedor em primeiro plano", "yes", "Endereço, logotipo e cores da sua escola"),
]
tbody = "".join(
  f'<tr><td>{l}</td><td><span class="cf">{mk(a)}<span>{at}</span></span></td>'
  f'<td class="hi"><span class="cf">{mk(b)}<span>{bt}</span></span></td></tr>'
  for l, a, at, b, bt in rows_cmp)

content_page(head("Posicionamento", "Por que não é mais um<br>sistema de gestão escolar",
  "A comparação é com o que a maior parte das escolas usa hoje: um sistema administrativo "
  "somado a planilhas e grupos de mensagem.") + f'''
<div class="grow" style="display:flex;flex-direction:column;justify-content:space-between">
<table>
  <thead><tr>
    <th style="width:23%"></th>
    <th style="width:33%">Sistema administrativo + planilhas</th>
    <th class="hi" style="width:44%">{BRAND}</th>
  </tr></thead>
  <tbody>{tbody}</tbody>
</table>
<div class="grid g3" style="margin-top:22px">
  {card("grid","Menos ferramentas","De seis sistemas paralelos para um só ambiente, com um login por pessoa.","blue")}
  {card("network","Menos retrabalho","O dado entra uma vez e reaparece em boletim, chamada, painel e portal da família.","cyan")}
  {card("gauge","Mais previsibilidade","Evasão e desempenho viram indicador acompanhável, não descoberta de fim de semestre.","violet")}
</div>
</div>
{band("target","<b>A diferença não é lista de recurso.</b> É que o dado nasce uma única vez e serve aluno, "
     "professor, secretaria e gestão ao mesmo tempo — justamente o que a soma de sistemas soltos nunca entrega.")}''',
  "blue", "Posicionamento")

# ══════════════ 24 · IMPLANTAÇÃO ══════════════
content_page(head("Implantação", "Da assinatura à turma usando,<br>sem parar a escola",
  "Cada fase entrega valor sozinha, sem exigir trocar tudo de uma vez.") + f'''
<div class="steps grow" style="justify-content:space-evenly">
  {step(1,"Marca e ambiente","Subdomínio, logotipo, cores e nome aplicados. A instituição já entra vendo a própria identidade, não a nossa.","blue")}
  {step(2,"Base e turmas","Importação de alunos, professores e turmas a partir das planilhas existentes, com validação e regra que evita cadastro duplicado.","cyan")}
  {step(3,"Conteúdo e avaliação","Acervo de questões carregado, provas anteriores importadas e primeiro simulado aplicado dentro da plataforma.","violet")}
  {step(4,"Operação completa","Secretaria, frequência, boletim, financeiro e painéis de gestão em uso, com equipe treinada e acompanhamento de adoção.","green")}
</div>
<div class="grid g3" style="margin-top:6px">
  {card("users","Treinamento por perfil","Capacitação separada para professor, secretaria e gestão — cada equipe aprende só o que usa.","indigo")}
  {card("gauge","Acompanhamento","Nas primeiras semanas, o painel de uso mostra quem ainda não entrou, para agir antes de a adoção esfriar.","amber")}
  {card("message","Suporte e evolução","Canal de suporte, registro de novidades dentro do produto e melhorias entregues a todos os clientes.","teal")}
</div>''', "violet", "Implantação")

# ══════════════ 25 · ENCERRAMENTO ══════════════
page(f'''<div class="topbar"></div>
<div class="pad" style="justify-content:space-between">
  <div class="kicker">Próximo passo</div>
  <div>
    <h1 style="font-size:44px;max-width:600px">Vamos rodar sua escola<br><span class="grad">dentro da plataforma</span></h1>
    <p class="lead" style="margin-top:22px;max-width:540px;font-size:15.5px;color:#B7C5E3">
      A forma mais rápida de avaliar é ver a plataforma com o nome da sua instituição,
      com uma turma real e um simulado de verdade aplicado nela.</p>
    <div class="grid g2" style="margin-top:30px">
      {card("eye","Demonstração guiada","Uma hora percorrendo os cinco perfis, com dados de exemplo e perguntas respondidas ao vivo.","blue",tint=False)}
      {card("scan","Piloto com turma real","Ambiente com a sua marca, uma turma carregada e um ciclo completo de simulado e redação.","cyan",tint=False)}
      {card("chart","Proposta sob medida","Escopo, prazo de implantação e investimento calculados pelo porte da instituição.","violet",tint=False)}
      {card("users","Treinamento incluído","Capacitação das equipes e acompanhamento de adoção nas primeiras semanas de uso.","green",tint=False)}
    </div>
  </div>
  <div style="border-top:1px solid rgba(255,255,255,.16);padding-top:22px;
              display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-family:Manrope;font-weight:800;font-size:21px;color:#fff">{BRAND}</div>
      <div style="font-size:12px;color:#8496BC;margin-top:5px">{TAGLINE}</div>
    </div>
    <div style="text-align:right;font-size:11.5px;color:#8496BC;line-height:1.8">
      Contato comercial<br>
      <span style="color:#C3D2EE;font-weight:600">comercial@suaescola.com.br</span><br>
      <span style="color:#C3D2EE;font-weight:600">(00) 00000-0000</span>
    </div>
  </div>
</div>''', "blue", cls="dark mesh", numbered=False)

# ══════════════ SAÍDA ══════════════
html = f'''<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>{BRAND} — {TAGLINE}</title>
<link rel="stylesheet" href="style.css">
</head><body>
{"".join(PAGES)}
</body></html>'''
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
open(out, "w", encoding="utf-8").write(html)
print(f"{len(PAGES)} páginas A4 -> {out}")
