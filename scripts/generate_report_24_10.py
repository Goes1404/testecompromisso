from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table,
    TableStyle, PageBreak, KeepTogether,
)


OUT = Path(__file__).resolve().parents[1] / "output" / "pdf" / "relatorio_aulas_online_24_10_2026.pdf"

ORANGE = colors.HexColor("#F16500")
INK = colors.HexColor("#19191F")
MUTED = colors.HexColor("#686A73")
LIGHT = colors.HexColor("#F4F5F7")
LINE = colors.HexColor("#DFE1E6")
GREEN = colors.HexColor("#058669")
WHITE = colors.white


def p(text, style):
    return Paragraph(text, style)


def styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle(name="Kicker", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=8,
                         leading=11, textColor=ORANGE, spaceAfter=8, tracking=1.7))
    s.add(ParagraphStyle(name="MainTitle", parent=s["Normal"], fontName="Helvetica-BoldOblique", fontSize=31,
                         leading=34, textColor=INK, spaceAfter=11))
    s.add(ParagraphStyle(name="H1", parent=s["Normal"], fontName="Helvetica-BoldOblique", fontSize=22,
                         leading=26, textColor=INK, spaceAfter=8))
    s.add(ParagraphStyle(name="H2", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=12,
                         leading=16, textColor=INK, spaceBefore=5, spaceAfter=5))
    s.add(ParagraphStyle(name="Body", parent=s["Normal"], fontName="Helvetica", fontSize=10.2,
                         leading=15, textColor=INK, spaceAfter=8))
    s.add(ParagraphStyle(name="Small", parent=s["Normal"], fontName="Helvetica", fontSize=8.5,
                         leading=12, textColor=MUTED, spaceAfter=5))
    s.add(ParagraphStyle(name="Metric", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=25,
                         leading=28, textColor=ORANGE, alignment=TA_LEFT))
    s.add(ParagraphStyle(name="MetricLabel", parent=s["Normal"], fontName="Helvetica", fontSize=8.2,
                         leading=11, textColor=MUTED))
    s.add(ParagraphStyle(name="TableHead", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=7.7,
                         leading=10, textColor=MUTED, tracking=0.7))
    s.add(ParagraphStyle(name="TableCell", parent=s["Normal"], fontName="Helvetica", fontSize=8.7,
                         leading=11, textColor=INK))
    s.add(ParagraphStyle(name="Callout", parent=s["Normal"], fontName="Helvetica-Bold", fontSize=12,
                         leading=16, textColor=INK))
    return s


S = styles()


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, 13 * mm, 192 * mm, 13 * mm)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(ORANGE)
    canvas.drawString(18 * mm, 8 * mm, "CURSINHO COMPROMISSO · AULAS AO VIVO")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(192 * mm, 8 * mm, f"24/10/2026 · Página {doc.page}")
    canvas.restoreState()


def metric(value, label):
    return [p(value, S["Metric"]), p(label, S["MetricLabel"])]


def metric_grid(items):
    rows = [[metric(v, l) for v, l in items]]
    t = Table(rows, colWidths=[43.5 * mm] * 4)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def data_table(headers, rows, widths):
    body = [[p(h, S["TableHead"]) for h in headers]]
    body += [[p(str(c), S["TableCell"]) for c in row] for row in rows]
    t = Table(body, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, LINE),
        ("LINEBELOW", (0, 1), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
    ]))
    return t


def callout(title, text, accent=ORANGE):
    combined = p(f"{title}<br/><br/><font name='Helvetica' size='10.2'>{text}</font>", S["Callout"])
    t = Table([[combined]], colWidths=[174 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF7F1")),
        ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#F7D8C4")),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def page_header(kicker, title, intro=None):
    a = [p(kicker, S["Kicker"]), p(title, S["H1"])]
    if intro:
        a.append(p(intro, S["Body"]))
    return a


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=17 * mm, bottomMargin=20 * mm,
        pageTemplates=[PageTemplate(id="main", frames=[Frame(18 * mm, 20 * mm, 174 * mm, 257 * mm, id="body")], onPage=footer)],
    )
    story = []

    # PAGE 1
    story += [Spacer(1, 13 * mm), p("CURSINHO COMPROMISSO · AULAS AO VIVO", S["Kicker"]),
              p("Aulas online de <font color='#F16500'>24/10</font>", S["MainTitle"]),
              p("A segunda manhã de aulas confirmou a evolução da operação: transmissões estáveis, mais alunos entrando pelo ambiente da plataforma e uma grade completa para ENEM e ETEC. O foco deixou de ser recuperar uma instabilidade e passou a ser ampliar a experiência e a medição de presença.", S["Body"]),
              Spacer(1, 7 * mm),
              metric_grid([
                  ("1.640", "visualizações\nno YouTube Studio"),
                  ("158", "alunos no módulo\nde aulas ao vivo"),
                  ("12", "aulas na grade\nde sábado"),
                  ("1.616", "mensagens no chat\nnas duas transmissões"),
              ]),
              Spacer(1, 9 * mm),
              callout("Resultado da manhã", "As duas transmissões permaneceram no ar por toda a manhã - 4h18 no ENEM e 4h29 na ETEC. Juntas, geraram 1.616 mensagens e 2.021 reações no chat. A ETEC atingiu pico de 107 espectadores simultâneos e média de 80; o ENEM, pico de 30 e média de 18. A plataforma registrou acesso de 158 alunos ao centro de transmissões, 28,5% acima dos 123 alunos registrados no sábado anterior."),
              Spacer(1, 22 * mm),
              p("RELATÓRIO EXECUTIVO · 25/10/2026", S["Small"]),
              PageBreak()]

    # PAGE 2
    story += page_header("EVOLUÇÃO EM UMA SEMANA", "Da correção de crise para uma operação estável", "Em 17/10, a prioridade foi estabilizar o acesso no pico. Em 24/10, a operação conseguiu sustentar duas transmissões longas e concentrar uma parcela maior da jornada no próprio ambiente de aulas.")
    story += [data_table(
        ["INDICADOR", "17/10", "24/10", "LEITURA"],
        [
            ["Alunos dentro da plataforma", "123", "158", "+28,5% de adesão ao módulo de lives"],
            ["Visitantes no site (Vercel)", "366", "312", "Menos tráfego, porém mais entrada pela plataforma"],
            ["Visualizações no YouTube", "1.972", "1.640", "YouTube Studio; o ENEM cresceu de 425 para 437"],
            ["Transmissões", "3", "2", "Operação simplificada em dois sinais contínuos"],
            ["Instabilidade crítica", "~72 min em duas fases", "Sem incidente crítico na telemetria", "A agenda transcorreu com sinal contínuo"],
        ],
        [48 * mm, 26 * mm, 26 * mm, 74 * mm],
    ), Spacer(1, 9 * mm),
    callout("A vitória principal", "O crescimento da presença no módulo de aulas ao vivo é o melhor sinal da evolução. A estratégia de orientar o aluno para a plataforma começou a funcionar: houve 35 entradas a mais que na semana anterior, com acesso distribuído ao longo da manhã."),
    Spacer(1, 8 * mm),
    p("Leitura de audiência", S["H2"]),
    p("O volume de visitantes do site foi menor que no sábado anterior (312 contra 366), mas a qualidade da jornada melhorou: mesmo com menos tráfego, a plataforma recebeu 158 alunos no módulo de lives, 28,5% a mais que em 17/10. A audiência total do YouTube ficou abaixo principalmente na ETEC, enquanto o ENEM cresceu levemente em visualizações e a ETEC sustentou média de 80 espectadores simultâneos, com pico de 107. A combinação de simultaneidade, tempo médio e participação no chat oferece uma leitura mais completa do sucesso da aula.", S["Body"]),
    PageBreak()]

    # PAGE 3
    story += page_header("GRADE E TRANSMISSÃO", "Uma manhã completa, em duas salas contínuas", "A operação reuniu seis aulas de ENEM e seis de ETEC entre 8h e 12h15, em duas transmissões com longa permanência no ar.")
    story += [p("ENEM", S["Kicker"]), data_table(
        ["HORÁRIO", "AULA", "PROFESSOR"],
        [["8h00", "Língua Portuguesa", "Prô Jota"], ["8h40", "Matemática", "Helio"], ["9h20", "Atualidades", "Alexandre"], ["10h20", "Física", "Pedro"], ["11h00", "Redação", "Fernando"], ["11h40", "Química", "Jorgênio"]],
        [28 * mm, 78 * mm, 68 * mm]), Spacer(1, 7 * mm),
    p("ETEC", S["Kicker"]), data_table(
        ["HORÁRIO", "AULA", "PROFESSOR"],
        [["8h00", "Geografia", "James"], ["8h40", "Química", "Jorgênio"], ["9h20", "Língua Portuguesa", "Fernando"], ["10h20", "Biologia", "Rômulo"], ["11h00", "Língua Portuguesa", "Prô Jota"], ["11h40", "História", "Régis"]],
        [28 * mm, 78 * mm, 68 * mm]), Spacer(1, 8 * mm),
    data_table(["FOCO", "DURAÇÃO", "VISUALIZAÇÕES", "TEMPO MÉDIO"], [["ENEM", "4h18", "437", "15min56s"], ["ETEC", "4h29", "1.203", "20min41s"]], [30 * mm, 36 * mm, 40 * mm, 68 * mm]),
    PageBreak()]

    # PAGE 4
    story += page_header("JORNADA DO ALUNO", "Mais entrada pela plataforma e primeiro acesso funcionando", "A telemetria registrou 189 alunos ativos no dia. Desses, 158 acessaram as telas de transmissões; no fluxo de primeiro acesso, houve 24 trocas de senha e 20 conclusões.")
    story += [metric_grid([
        ("189", "alunos ativos\nno dia"),
        ("158", "alunos no módulo\nde lives"),
        ("411", "sessões no módulo\nde lives"),
        ("24", "trocas de senha\nno primeiro acesso"),
    ]), Spacer(1, 9 * mm),
    p("O que os dados mostram", S["H2"]),
    p("O centro de transmissões foi a tela mais acessada do dia: 158 alunos navegaram pela lista ou pela página de uma aula, com concentração entre 8h e 10h. Isso confirma que o ambiente próprio passou a ser uma porta de entrada relevante para a operação, além dos links públicos do YouTube. As duas salas tiveram participação ao vivo: 1.616 mensagens e 2.021 reações no total.", S["Body"]),
    p("O fluxo de primeiro acesso também teve aderência: 20 alunos concluíram o processo e 24 trocaram a senha. Os registros são positivos, embora ainda seja importante manter o suporte de recuperação para os poucos casos que falharam.", S["Body"]),
    callout("Mais controle sobre a experiência", "A plataforma já mostra o interesse de 158 alunos pelas aulas. O próximo ganho é converter essa entrada em presença validada, duração assistida e participação por aula - métricas que vão transformar a boa operação em evidência acadêmica ainda mais forte."),
    PageBreak()]

    # PAGE 5
    story += page_header("O QUE MELHOROU", "As ações após 17/10 produziram efeito", "O relatório anterior apontou prioridades práticas. A operação de 24/10 mostrou avanços na estabilidade e no acesso; agora o desafio é amadurecer a auditoria e a comunicação.")
    story += [data_table(
        ["AÇÃO APÓS 17/10", "EVIDÊNCIA EM 24/10", "PRÓXIMO NÍVEL"],
        [
            ["Preparar a plataforma para o pico", "Não houve incidente crítico registrado durante a manhã", "Executar teste de carga recorrente antes de cada sábado"],
            ["Manter o ambiente dimensionado", "Duas transmissões sustentadas por mais de 4 horas", "Monitorar capacidade e alertas em tempo real"],
            ["Levar o aluno para a plataforma", "158 alunos acessaram o módulo; ETEC teve pico de 107 simultâneos", "Associar entrada, presença e tempo assistido"],
            ["Melhorar o primeiro acesso", "24 trocas de senha e 20 conclusões do fluxo", "Antecipar orientação de acesso na semana"],
        ],
        [55 * mm, 60 * mm, 59 * mm]), Spacer(1, 9 * mm),
    p("Ajustes que consolidam o resultado", S["H2"]),
    p("A operação foi bem-sucedida, mas a próxima versão precisa deixar a medição à altura da experiência. Dez aulas permaneceram marcadas como “agendadas” no banco depois do horário e não houve sessões formais de presença. Além disso, os avisos automáticos geraram notificações duplicadas e mensagens de teste. São oportunidades de acabamento, não obstáculos para o sucesso da manhã.", S["Body"]),
    PageBreak()]

    # PAGE 6
    story += page_header("PRÓXIMO SÁBADO", "Transformar um sucesso operacional em padrão", "A base já está pronta: sinal estável, grade completa e adesão maior à plataforma. Os próximos passos aumentam a confiabilidade do dado e a qualidade percebida pelo aluno.")
    story += [data_table(
        ["PRIORIDADE", "AÇÃO", "RESULTADO ESPERADO"],
        [
            ["Presença", "Criar sessão de chamada para cada aula e associar a entrada na sala", "Presença automática e auditável"],
            ["Status", "Automatizar abertura e encerramento de cada aula", "Grade confiável, sem itens presos em “agendada”"],
            ["Comunicação", "Separar ambiente de teste e deduplicar os avisos", "Notificação certa, uma vez, para o público certo"],
            ["Métricas", "Salvar tempo assistido, chat, reações e dúvidas por aula", "Relatório pedagógico completo por turma"],
            ["Acesso", "Enviar orientação e link de primeiro acesso antes do sábado", "Menos atrito no horário de pico"],
        ],
        [34 * mm, 78 * mm, 62 * mm]), Spacer(1, 15 * mm),
    callout("Síntese", "24 de outubro demonstrou que o Cursinho Compromisso conseguiu evoluir rapidamente: uma manhã inteira de aulas foi transmitida com estabilidade, em uma grade robusta, e com mais alunos entrando pelo ambiente da própria plataforma. O próximo passo é medir essa experiência com a mesma qualidade com que ela já está sendo entregue.", GREEN),
    Spacer(1, 15 * mm),
    p("Fontes: Vercel Analytics, banco de dados da plataforma, telemetria de produto e YouTube Studio. Visualizações não equivalem a espectadores únicos; os dados de duração, simultaneidade, mensagens e reações se referem às transmissões ao vivo de 24/10/2026.", S["Small"])]

    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    build()
