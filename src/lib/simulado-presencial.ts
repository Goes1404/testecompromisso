/**
 * Simulado presencial: inscrição pela plataforma e sala sorteada.
 *
 * Regras puras (sem Supabase) para as telas do aluno, da home e da secretaria.
 * O que decide de verdade — janela, público, número, sorteio, quando a sala
 * aparece — está no banco (`20261106120000_simulado_presencial.sql`). Aqui só
 * se desenha o mesmo estado; se os dois discordarem, quem vale é o banco.
 *
 * Datas: tudo no fuso da escola. `aplicado_em` é DATE (lido em hora local, como
 * `entrega_em` do mural); os instantes da janela são TIMESTAMPTZ e são mostrados
 * em America/Sao_Paulo, porque o servidor roda em UTC.
 */

export const FUSO = "America/Sao_Paulo";
/** Brasília sem horário de verão desde 2019. */
export const OFFSET_DA_ESCOLA = "-03:00";

export type PublicoDoSimulado = "todos" | "ENEM" | "ETEC";
export const PUBLICOS: { valor: PublicoDoSimulado; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos os alunos" },
  { valor: "ETEC", rotulo: "Só ETEC" },
  { valor: "ENEM", rotulo: "Só ENEM" },
];

export type FaseDoSimulado = "em_breve" | "inscricoes" | "aguardando_sala" | "sala_divulgada";

export interface JanelaDoSimulado {
  inscricao_abre: string;
  inscricao_fecha: string;
  salas_divulgadas_em: string;
}

export interface InscricaoDoAluno {
  numero: number;
  nome: string;
  turma: string | null;
  inscrito_em: string;
  sala: string | null;
  predio: string | null;
  carteira: number | null;
}

/** O que `simulados_presenciais_do_aluno()` devolve por simulado. */
export interface SimuladoDoAluno extends JanelaDoSimulado {
  id: string;
  titulo: string;
  aplicado_em: string;
  horario: string | null;
  local: string | null;
  publico: PublicoDoSimulado;
  instrucoes: string | null;
  agora: string;
  elegivel: boolean;
  inscricao: InscricaoDoAluno | null;
}

export interface SimuladoPresencial extends JanelaDoSimulado {
  id: string;
  titulo: string;
  aplicado_em: string;
  horario: string | null;
  local: string | null;
  publico: PublicoDoSimulado;
  instrucoes: string | null;
  sorteado_em: string | null;
  ativo: boolean;
  created_at: string;
}

export interface SalaDoSimulado {
  id: string;
  simulado_id: string;
  nome: string;
  predio: string | null;
  capacidade: number;
  reserva: boolean;
  ordem: number;
}

export interface InscricaoNaSecretaria {
  id: string;
  user_id: string;
  numero: number;
  nome: string;
  foco: string | null;
  turma: string | null;
  sala_id: string | null;
  carteira: number | null;
  origem: "aluno" | "secretaria";
  created_at: string;
}

export const INSTRUCOES_PADRAO =
  "Chegue com 30 minutos de antecedência.\n" +
  "Sem o RG original não é possível fazer a prova na sala sorteada.\n" +
  "Celular desligado e guardado durante toda a prova.";

/** O que o aluno precisa levar — vale para todo simulado presencial. */
export const LEVAR_NO_DIA = [
  "RG original (com foto)",
  "Ficha de inscrição (impressa ou aberta no celular)",
  "Caneta esferográfica preta, de corpo transparente",
];

// ── Fase ────────────────────────────────────────────────────────────────────
export function faseDoSimulado(s: JanelaDoSimulado, agora: Date = new Date()): FaseDoSimulado {
  const t = agora.getTime();
  if (t < new Date(s.inscricao_abre).getTime()) return "em_breve";
  if (t <= new Date(s.inscricao_fecha).getTime()) return "inscricoes";
  if (t < new Date(s.salas_divulgadas_em).getTime()) return "aguardando_sala";
  return "sala_divulgada";
}

/**
 * O que a home mostra (ou nada). Só cobra o que o aluno ainda pode fazer:
 * inscrição aberta e não feita, ou a sala já saiu. Inscrito esperando o
 * sorteio também aparece, para ele saber quando volta a olhar.
 */
export type AvisoDaHome =
  | { tipo: "inscrever"; simulado: SimuladoDoAluno }
  | { tipo: "aguardando"; simulado: SimuladoDoAluno }
  | { tipo: "sala"; simulado: SimuladoDoAluno };

export function avisoParaHome(lista: SimuladoDoAluno[], agora: Date = new Date()): AvisoDaHome | null {
  for (const s of lista) {
    if (!s.elegivel) continue;
    const fase = faseDoSimulado(s, agora);
    if (!s.inscricao) {
      if (fase === "inscricoes") return { tipo: "inscrever", simulado: s };
      continue;
    }
    if (fase === "sala_divulgada" && s.inscricao.sala) return { tipo: "sala", simulado: s };
    return { tipo: "aguardando", simulado: s };
  }
  return null;
}

// ── Datas ───────────────────────────────────────────────────────────────────
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "2026-11-14" → "sábado, 14/11". Lida em hora local, nunca como UTC. */
export function diaDoSimulado(data: string): string {
  const [a, m, d] = data.slice(0, 10).split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  return `${DIAS[dt.getDay()]}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

const formatadorDeInstante = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

/** Instante → "08/11 às 00:00", no fuso da escola. */
export function instante(iso: string): string {
  const partes = Object.fromEntries(formatadorDeInstante.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  const hora = partes.hour === "24" ? "00" : partes.hour;
  return `${partes.day}/${partes.month} às ${hora}:${partes.minute}`;
}

/** Instante → valor de `<input type="datetime-local">` no fuso da escola. */
export function paraCampoDeData(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  const hora = p.hour === "24" ? "00" : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hora}:${p.minute}`;
}

/** Valor do campo (hora de Brasília) → ISO com fuso, para o banco. */
export function doCampoDeData(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  return `${valor}:00${OFFSET_DA_ESCOLA}`;
}

// ── Formulário da secretaria ────────────────────────────────────────────────
export interface RascunhoDoSimulado {
  titulo: string;
  aplicado_em: string;
  horario: string;
  local: string;
  publico: PublicoDoSimulado;
  inscricao_abre: string; // datetime-local
  inscricao_fecha: string;
  salas_divulgadas_em: string;
  instrucoes: string;
}

export const RASCUNHO_VAZIO: RascunhoDoSimulado = {
  titulo: "",
  aplicado_em: "",
  horario: "",
  local: "",
  publico: "todos",
  inscricao_abre: "",
  inscricao_fecha: "",
  salas_divulgadas_em: "",
  instrucoes: INSTRUCOES_PADRAO,
};

export function rascunhoDe(s: SimuladoPresencial): RascunhoDoSimulado {
  return {
    titulo: s.titulo,
    aplicado_em: s.aplicado_em,
    horario: s.horario ?? "",
    local: s.local ?? "",
    publico: s.publico,
    inscricao_abre: paraCampoDeData(s.inscricao_abre),
    inscricao_fecha: paraCampoDeData(s.inscricao_fecha),
    salas_divulgadas_em: paraCampoDeData(s.salas_divulgadas_em),
    instrucoes: s.instrucoes ?? "",
  };
}

/** Devolve o erro para mostrar, ou o registro pronto para gravar. */
export function validarSimulado(r: RascunhoDoSimulado):
  | { erro: string }
  | { registro: Omit<SimuladoPresencial, "id" | "sorteado_em" | "ativo" | "created_at"> } {
  const titulo = r.titulo.trim();
  if (titulo.length < 3) return { erro: "Dê um título ao simulado." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.aplicado_em)) return { erro: "Informe a data do simulado." };
  const abre = doCampoDeData(r.inscricao_abre);
  const fecha = doCampoDeData(r.inscricao_fecha);
  const divulga = doCampoDeData(r.salas_divulgadas_em);
  if (!abre || !fecha) return { erro: "Informe quando as inscrições abrem e fecham." };
  if (!divulga) return { erro: "Informe quando a sala aparece para o aluno." };
  if (new Date(fecha) <= new Date(abre)) return { erro: "O fim das inscrições precisa ser depois do início." };
  if (new Date(divulga) < new Date(fecha)) {
    return { erro: "A sala só pode aparecer depois que as inscrições fecharem (o sorteio precisa da lista final)." };
  }
  const fimDoDia = new Date(`${r.aplicado_em}T23:59:00${OFFSET_DA_ESCOLA}`);
  if (new Date(divulga) > fimDoDia) return { erro: "A sala precisa aparecer antes do dia do simulado." };
  return {
    registro: {
      titulo,
      aplicado_em: r.aplicado_em,
      horario: r.horario.trim() || null,
      local: r.local.trim() || null,
      publico: r.publico,
      inscricao_abre: abre,
      inscricao_fecha: fecha,
      salas_divulgadas_em: divulga,
      instrucoes: r.instrucoes.trim() || null,
    },
  };
}

// ── Salas ───────────────────────────────────────────────────────────────────
export interface OcupacaoDaSala extends SalaDoSimulado {
  ocupadas: number;
}

export function ocupacao(salas: SalaDoSimulado[], inscricoes: Pick<InscricaoNaSecretaria, "sala_id">[]): OcupacaoDaSala[] {
  const conta = new Map<string, number>();
  for (const i of inscricoes) if (i.sala_id) conta.set(i.sala_id, (conta.get(i.sala_id) ?? 0) + 1);
  return [...salas]
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }))
    .map((s) => ({ ...s, ocupadas: conta.get(s.id) ?? 0 }));
}

/** Lugares que entram no sorteio (salas de reserva ficam fora). */
export function lugaresNoSorteio(salas: SalaDoSimulado[]): number {
  return salas.filter((s) => !s.reserva).reduce((t, s) => t + s.capacidade, 0);
}

/**
 * "Sala 1 a 8, 40 lugares" vira 8 salas. Começa depois do maior número que já
 * existe com o mesmo prefixo, para não bater no nome único.
 */
export function salasEmLote(
  existentes: Pick<SalaDoSimulado, "nome" | "ordem">[],
  quantidade: number,
  capacidade: number,
  prefixo = "Sala",
  predio: string | null = null,
  reserva = false,
): Omit<SalaDoSimulado, "id" | "simulado_id">[] {
  const p = prefixo.trim() || "Sala";
  const nomes = new Set(existentes.map((e) => e.nome.toLowerCase()));
  const maiorOrdem = existentes.reduce((m, e) => Math.max(m, e.ordem), 0);
  const novas: Omit<SalaDoSimulado, "id" | "simulado_id">[] = [];
  let n = 1;
  while (novas.length < Math.max(0, Math.min(quantidade, 60))) {
    const nome = `${p} ${n}`;
    if (!nomes.has(nome.toLowerCase())) {
      novas.push({ nome, predio: predio?.trim() || null, capacidade, reserva, ordem: maiorOrdem + novas.length + 1 });
    }
    n++;
  }
  return novas;
}

// ── Texto e impressão ───────────────────────────────────────────────────────
export function numeroDeInscricao(n: number): string {
  return String(n).padStart(4, "0");
}

export function ondeFica(sala: string | null, predio: string | null): string {
  if (!sala) return "";
  return predio ? `${sala} · ${predio}` : sala;
}

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const ESTILO_DE_IMPRESSAO = `
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:0 0 4px}
  .sub{color:#555;font-size:12px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #999;padding:6px 8px;text-align:left}
  th{background:#f2f2f2}
  .pagina{page-break-after:always} .pagina:last-child{page-break-after:auto}
  .assinatura{width:38%}
  .ficha{border:2px solid #111;border-radius:12px;padding:20px;max-width:640px}
  .faixa{background:#ff6b00;color:#fff;font-weight:bold;padding:8px 12px;border-radius:8px;display:inline-block;margin-bottom:12px}
  .grande{font-size:28px;font-weight:bold;letter-spacing:2px}
  .grade{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
  .rot{font-size:10px;text-transform:uppercase;color:#666;letter-spacing:1px}
  .val{font-size:15px;font-weight:bold}
  ul{margin:6px 0 0 18px;padding:0;font-size:13px}
  @media print{body{margin:10mm}}
`;

function documento(titulo: string, corpo: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>` +
    `<style>${ESTILO_DE_IMPRESSAO}</style></head><body>${corpo}` +
    `<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
}

export function fichaHtml(s: SimuladoDoAluno, i: InscricaoDoAluno): string {
  const sala = i.sala ? ondeFica(i.sala, i.predio) + (i.carteira ? ` — carteira ${i.carteira}` : "")
    : `Divulgada em ${instante(s.salas_divulgadas_em)}`;
  const instrucoes = (s.instrucoes ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const corpo = `
  <div class="ficha">
    <div class="faixa">Cursinho Compromisso · Ficha de inscrição</div>
    <h1>${esc(s.titulo)}</h1>
    <div class="sub">${esc(diaDoSimulado(s.aplicado_em))}${s.horario ? " · " + esc(s.horario) : ""}${s.local ? " · " + esc(s.local) : ""}</div>
    <div class="rot">Nº de inscrição</div>
    <div class="grande">${esc(numeroDeInscricao(i.numero))}</div>
    <div class="grade">
      <div><div class="rot">Aluno(a)</div><div class="val">${esc(i.nome)}</div></div>
      <div><div class="rot">Turma</div><div class="val">${esc(i.turma ? "Turma " + i.turma : "—")}</div></div>
      <div><div class="rot">Sala da prova</div><div class="val">${esc(sala)}</div></div>
      <div><div class="rot">Inscrito em</div><div class="val">${esc(instante(i.inscrito_em))}</div></div>
    </div>
    <div class="rot">Leve no dia</div>
    <ul>${LEVAR_NO_DIA.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
    ${instrucoes.length ? `<div class="rot" style="margin-top:12px">Instruções</div><ul>${instrucoes.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
  </div>`;
  return documento(`Ficha ${numeroDeInscricao(i.numero)}`, corpo);
}

export interface LinhaDaLista {
  numero: number;
  nome: string;
  turma: string | null;
  sala: string | null;
  predio: string | null;
  carteira: number | null;
}

const porNome = (a: LinhaDaLista, b: LinhaDaLista) => a.nome.localeCompare(b.nome, "pt-BR");

/** Uma folha por sala, por ordem de carteira, com coluna de assinatura. */
export function listasDasSalasHtml(s: Pick<SimuladoPresencial, "titulo" | "aplicado_em">, salas: SalaDoSimulado[], linhas: LinhaDaLista[]): string {
  const paginas = ocupacao(salas, [])
    .filter((sa) => !sa.reserva)
    .map((sa) => {
      const daSala = linhas.filter((l) => l.sala === sa.nome).sort((a, b) => (a.carteira ?? 0) - (b.carteira ?? 0));
      if (daSala.length === 0) return "";
      return `<div class="pagina">
        <h1>${esc(ondeFica(sa.nome, sa.predio))}</h1>
        <div class="sub">${esc(s.titulo)} · ${esc(diaDoSimulado(s.aplicado_em))} · ${daSala.length} aluno(s)</div>
        <table><thead><tr><th>Carteira</th><th>Inscrição</th><th>Nome</th><th>Turma</th><th>RG conferido</th><th class="assinatura">Assinatura</th></tr></thead>
        <tbody>${daSala.map((l) => `<tr><td>${esc(l.carteira ?? "")}</td><td>${esc(numeroDeInscricao(l.numero))}</td><td>${esc(l.nome)}</td><td>${esc(l.turma ?? "")}</td><td></td><td></td></tr>`).join("")}</tbody></table>
      </div>`;
    })
    .join("");
  return documento(`Listas por sala — ${s.titulo}`, paginas || "<p>Nenhum aluno sorteado ainda.</p>");
}

/** Lista da portaria: todos em ordem alfabética, com a sala de cada um. */
export function listaDaPortariaHtml(s: Pick<SimuladoPresencial, "titulo" | "aplicado_em">, linhas: LinhaDaLista[]): string {
  const ordenadas = [...linhas].sort(porNome);
  const corpo = `<h1>Onde é a minha sala? — ${esc(s.titulo)}</h1>
    <div class="sub">${esc(diaDoSimulado(s.aplicado_em))} · ${ordenadas.length} inscritos · ordem alfabética</div>
    <table><thead><tr><th>Nome</th><th>Inscrição</th><th>Turma</th><th>Sala</th><th>Carteira</th></tr></thead>
    <tbody>${ordenadas.map((l) => `<tr><td>${esc(l.nome)}</td><td>${esc(numeroDeInscricao(l.numero))}</td><td>${esc(l.turma ?? "")}</td><td>${esc(l.sala ? ondeFica(l.sala, l.predio) : "SEM SALA — reserva")}</td><td>${esc(l.carteira ?? "")}</td></tr>`).join("")}</tbody></table>`;
  return documento(`Portaria — ${s.titulo}`, corpo);
}

/** Abre o HTML numa aba nova e chama a impressão. Precisa vir de um clique. */
export function imprimir(html: string): boolean {
  const janela = window.open("", "_blank");
  if (!janela) return false;
  janela.document.open();
  janela.document.write(html);
  janela.document.close();
  return true;
}

/** Recado pronto para o WhatsApp das turmas. */
export function recadoDeInscricao(s: Pick<SimuladoPresencial, "titulo" | "aplicado_em" | "inscricao_abre" | "inscricao_fecha" | "salas_divulgadas_em">, link: string): string {
  return [
    `📝 *${s.titulo}* — ${diaDoSimulado(s.aplicado_em)}`,
    "",
    "A inscrição é *obrigatória* e é feita pela plataforma:",
    link,
    "",
    `🗓️ Inscrições: de ${instante(s.inscricao_abre)} até ${instante(s.inscricao_fecha)}`,
    `🏫 A sala de cada aluno sai na plataforma em ${instante(s.salas_divulgadas_em)}`,
    "",
    "No dia, leve:",
    ...LEVAR_NO_DIA.map((l) => `• ${l}`),
  ].join("\n");
}
