/**
 * Ficha de inscrição 2027 — regras puras da ficha online e da planilha da equipe.
 *
 * O banco (`20261116120000_matriculas_2027.sql` e `20261116180000_inscricao_com_sala.sql`)
 * decide janela, número, repetida, a sala na hora da inscrição (sempre do foco
 * do aluno), a lista de espera e o "preencher vagas". Aqui fica o que a tela precisa saber
 * antes de perguntar ao banco: validação da ficha (mesma na API e no
 * navegador), rótulos, prévia do sorteio, repetidas e a planilha do Excel.
 */
import { normalizarNome } from "@/lib/primeiro-acesso";

export const ANO_MATRICULA = 2027;
export const FUSO = "America/Sao_Paulo";

export type Foco = "ETEC" | "ENEM";
export type Serie = "9EF" | "1EM" | "2EM" | "3EM" | "formado";
export type EscolaTipo = "publica" | "particular" | "bolsista";
export type Turno = "manha" | "tarde" | "noite" | "integral" | "nao_estuda";
export type StatusMatricula = "recebida" | "confirmada" | "espera" | "cancelada";

export const SERIES: { valor: Serie; rotulo: string }[] = [
  { valor: "9EF", rotulo: "9º ano do Fundamental" },
  { valor: "1EM", rotulo: "1º ano do Ensino Médio" },
  { valor: "2EM", rotulo: "2º ano do Ensino Médio" },
  { valor: "3EM", rotulo: "3º ano do Ensino Médio" },
  { valor: "formado", rotulo: "Já terminei o Ensino Médio" },
];
export const ESCOLA_TIPOS: { valor: EscolaTipo; rotulo: string }[] = [
  { valor: "publica", rotulo: "Pública" },
  { valor: "particular", rotulo: "Particular" },
  { valor: "bolsista", rotulo: "Particular com bolsa" },
];
export const TURNOS: { valor: Turno; rotulo: string }[] = [
  { valor: "manha", rotulo: "Manhã" },
  { valor: "tarde", rotulo: "Tarde" },
  { valor: "noite", rotulo: "Noite" },
  { valor: "integral", rotulo: "Integral" },
  { valor: "nao_estuda", rotulo: "Não estou estudando" },
];
export const STATUS: { valor: StatusMatricula; rotulo: string; cor: string }[] = [
  { valor: "recebida", rotulo: "Recebida", cor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  { valor: "confirmada", rotulo: "Confirmada", cor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { valor: "espera", rotulo: "Lista de espera", cor: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  { valor: "cancelada", rotulo: "Cancelada", cor: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
];
export const COMO_CONHECEU = ["Instagram", "Amigo ou familiar", "Escola", "WhatsApp", "Já fui aluno", "Outro"];
export const PARENTESCOS = ["Mãe", "Pai", "Avó/Avô", "Tia/Tio", "Irmã/Irmão", "Responsável legal", "Outro"];

/**
 * A série sai do foco (decisão da coordenação, 16/11): quem faz ETEC está no
 * 9º ano, quem faz ENEM está no 3º ano (ou já terminou). A ficha não pergunta.
 */
export const serieDoFoco = (foco: Foco | ""): Serie | "" => (foco === "ETEC" ? "9EF" : foco === "ENEM" ? "3EM" : "");

/** Status que ocupam lugar numa sala. Lista de espera e cancelada não têm sala. */
export const TEM_SALA: StatusMatricula[] = ["recebida", "confirmada"];
export const ocupaSala = (m: { status: StatusMatricula; sala: number | null }) => !!m.sala && TEM_SALA.includes(m.status);

export const rotulo = <T extends string>(lista: { valor: T; rotulo: string }[], v: T | null | undefined) =>
  lista.find((x) => x.valor === v)?.rotulo ?? (v ?? "");

// ── Ficha ───────────────────────────────────────────────────────────────────
export interface Ficha {
  nome: string;
  nascimento: string; // YYYY-MM-DD
  celular: string;
  email: string;
  bairro: string;
  cidade: string;
  foco: Foco | "";
  serie: Serie | "";
  escola: string;
  escola_tipo: EscolaTipo | "";
  turno_escola: Turno | "";
  ja_fez_cursinho: boolean;
  ex_aluno: boolean;
  resp_nome: string;
  resp_parentesco: string;
  resp_celular: string;
  como_conheceu: string;
  aceite_veracidade: boolean;
  aceite_dados: boolean;
  aceite_imagem: boolean;
}

export const FICHA_VAZIA: Ficha = {
  nome: "", nascimento: "", celular: "", email: "", bairro: "", cidade: "Santana de Parnaíba",
  foco: "", serie: "", escola: "", escola_tipo: "", turno_escola: "", ja_fez_cursinho: false, ex_aluno: false,
  resp_nome: "", resp_parentesco: "", resp_celular: "", como_conheceu: "",
  aceite_veracidade: false, aceite_dados: false, aceite_imagem: false,
};

export const PASSOS = [
  { titulo: "Aluno", campos: ["nome", "nascimento", "celular", "email", "bairro", "cidade"] },
  { titulo: "Estudos", campos: ["foco", "escola", "escola_tipo", "turno_escola", "ja_fez_cursinho", "ex_aluno"] },
  { titulo: "Responsável", campos: ["resp_nome", "resp_parentesco", "resp_celular", "como_conheceu"] },
  { titulo: "Autorizações", campos: ["aceite_veracidade", "aceite_dados", "aceite_imagem"] },
] as const;

export const soDigitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export function formatarCelular(s: string | null | undefined): string {
  const d = soDigitos(s);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s ?? "";
}

/** Data de hoje no fuso da escola, "YYYY-MM-DD". */
export function hojeNaEscola(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** Idade completa numa data ("YYYY-MM-DD"), sem fuso: conta por data, nunca por hora. */
export function idade(nascimento: string, hoje: string): number {
  const [a, m, d] = nascimento.split("-").map(Number);
  const [ha, hm, hd] = hoje.split("-").map(Number);
  let anos = ha - a;
  if (hm < m || (hm === m && hd < d)) anos--;
  return anos;
}

export const ehMenor = (nascimento: string, hoje: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(nascimento) && idade(nascimento, hoje) < 18;

function dataValida(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export type ErrosDaFicha = Partial<Record<keyof Ficha, string>>;

/**
 * Valida a ficha inteira. Devolve os erros por campo (vazio = ok) e a ficha
 * limpa (celulares só com dígitos, textos aparados), pronta para o banco.
 */
export function validarFicha(f: Ficha, hoje: string): { erros: ErrosDaFicha; limpa: Ficha } {
  const e: ErrosDaFicha = {};
  const t = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();
  const limpa: Ficha = {
    ...f,
    nome: t(f.nome), email: t(f.email).toLowerCase(), bairro: t(f.bairro), cidade: t(f.cidade), escola: t(f.escola),
    resp_nome: t(f.resp_nome), resp_parentesco: t(f.resp_parentesco), como_conheceu: t(f.como_conheceu),
    celular: soDigitos(f.celular), resp_celular: soDigitos(f.resp_celular),
  };
  // A série não é perguntada na ficha: vem do foco. A equipe ainda pode corrigir na planilha.
  if (!limpa.serie) limpa.serie = serieDoFoco(limpa.foco);

  if (limpa.nome.split(" ").length < 2 || limpa.nome.length < 5) e.nome = "Escreva o nome completo (nome e sobrenome).";
  else if (limpa.nome.length > 120) e.nome = "Nome muito longo.";
  else if (/\d/.test(limpa.nome)) e.nome = "O nome não pode ter números.";

  if (!dataValida(limpa.nascimento)) e.nascimento = "Informe a data de nascimento.";
  else {
    const anos = idade(limpa.nascimento, hoje);
    if (anos < 10 || anos > 80) e.nascimento = "Confira a data de nascimento.";
  }

  if (!/^\d{10,11}$/.test(limpa.celular)) e.celular = "Celular com DDD, só números (ex.: 11 91234-5678).";
  if (limpa.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpa.email)) e.email = "E-mail inválido (ou deixe em branco).";
  if (limpa.bairro.length < 2) e.bairro = "Informe o bairro.";
  if (limpa.cidade.length < 2) e.cidade = "Informe a cidade.";

  if (!limpa.foco) e.foco = "Escolha ETEC ou ENEM.";
  if (limpa.escola.length < 2) e.escola = "Informe a escola.";
  if (!limpa.escola_tipo) e.escola_tipo = "Escolha o tipo de escola.";
  if (!limpa.turno_escola) e.turno_escola = "Escolha o turno.";

  const menor = !e.nascimento && ehMenor(limpa.nascimento, hoje);
  if (menor) {
    if (limpa.resp_nome.split(" ").length < 2) e.resp_nome = "Nome completo do responsável.";
    if (!limpa.resp_parentesco) e.resp_parentesco = "Escolha o parentesco.";
    if (!/^\d{10,11}$/.test(limpa.resp_celular)) e.resp_celular = "Celular do responsável com DDD.";
  } else if (limpa.resp_celular && !/^\d{10,11}$/.test(limpa.resp_celular)) {
    e.resp_celular = "Celular com DDD, só números.";
  }

  if (!limpa.aceite_veracidade) e.aceite_veracidade = "É preciso confirmar que as informações são verdadeiras.";
  if (!limpa.aceite_dados) e.aceite_dados = menor
    ? "O responsável precisa autorizar o uso dos dados para a matrícula."
    : "É preciso autorizar o uso dos dados para a matrícula.";

  return { erros: e, limpa };
}

/** Erros só dos campos de um passo (para avançar no formulário). */
export function errosDoPasso(passo: number, erros: ErrosDaFicha): ErrosDaFicha {
  const campos = PASSOS[passo]?.campos as readonly string[] | undefined;
  if (!campos) return {};
  return Object.fromEntries(Object.entries(erros).filter(([k]) => campos.includes(k))) as ErrosDaFicha;
}

/** O que vai para `registrar_matricula()`. */
export function paraOBanco(f: Ficha, ano = ANO_MATRICULA) {
  return {
    ano, nome: f.nome, nascimento: f.nascimento, celular: f.celular, email: f.email || null,
    bairro: f.bairro, cidade: f.cidade, foco: f.foco, serie: f.serie, escola: f.escola,
    escola_tipo: f.escola_tipo, turno_escola: f.turno_escola, ja_fez_cursinho: f.ja_fez_cursinho,
    ex_aluno: f.ex_aluno, resp_nome: f.resp_nome || null, resp_parentesco: f.resp_parentesco || null,
    resp_celular: f.resp_celular || null, como_conheceu: f.como_conheceu || null,
    aceite_veracidade: f.aceite_veracidade, aceite_dados: f.aceite_dados, aceite_imagem: f.aceite_imagem,
  };
}

// ── Janela ──────────────────────────────────────────────────────────────────
export interface TurmaDaMatricula {
  ano: number;
  abre_em: string;
  fecha_em: string;
  aberta: boolean;
}

export type SituacaoDaFicha = "aberta" | "antes" | "encerrada" | "pausada";

export function situacaoDaFicha(t: TurmaDaMatricula, agora: Date = new Date()): SituacaoDaFicha {
  if (!t.aberta) return "pausada";
  if (agora < new Date(t.abre_em)) return "antes";
  if (agora > new Date(t.fecha_em)) return "encerrada";
  return "aberta";
}

const fmtInstante = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});
/** "31/01/2027 às 23:59", no fuso da escola. */
export function instante(iso: string): string {
  const p = Object.fromEntries(fmtInstante.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} às ${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}
/** "YYYY-MM-DD" → "dd/mm/aaaa" sem passar por Date (nada de fuso). */
export const dataBR = (d: string | null | undefined) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

/** Instante → valor de `<input type="datetime-local">` no fuso da escola. */
export function paraCampoDeData(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}
/** Campo (hora de Brasília, sem horário de verão desde 2019) → ISO com fuso. */
export const doCampoDeData = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00-03:00` : null);

// ── Planilha da equipe ──────────────────────────────────────────────────────
export interface Matricula extends Omit<Ficha, "foco" | "serie" | "escola_tipo" | "turno_escola" | "email"> {
  id: string;
  ano: number;
  numero: number;
  protocolo: string;
  email: string | null;
  foco: Foco;
  serie: Serie;
  escola_tipo: EscolaTipo;
  turno_escola: Turno;
  status: StatusMatricula;
  sala: number | null;
  observacoes: string | null;
  origem: "site" | "secretaria";
  created_at: string;
  updated_at: string;
}

export interface SalaDaMatricula {
  ano: number;
  sala: number;
  foco: Foco;
  capacidade: number;
}

export function statusParaMostrar(m: Pick<Matricula, "status" | "sala">): string {
  if (m.status === "confirmada" && m.sala) return `Sala ${m.sala}`;
  if (m.status === "recebida" && m.sala) return `Recebida · Sala ${m.sala}`;
  return rotulo(STATUS, m.status);
}

// ── Consulta e tela de "inscrição recebida" ─────────────────────────────────
/** O que `consultar_inscricao()` devolve: só o que o aluno precisa ver. */
export interface SituacaoDaInscricao {
  protocolo: string;
  primeiro_nome: string;
  foco: Foco;
  status: StatusMatricula;
  sala: number | null;
  posicao: number | null;
}

/** Título e frase da situação, para a tela do aluno (inscrição e consulta). */
export function textoDaSituacao(s: Pick<SituacaoDaInscricao, "status" | "sala" | "posicao" | "foco">): { titulo: string; frase: string } {
  if (s.status === "cancelada") {
    return { titulo: "Inscrição cancelada", frase: "Esta inscrição foi cancelada. Se foi engano, fale com a secretaria do cursinho." };
  }
  if (s.status === "espera") {
    return {
      titulo: s.posicao ? `Lista de espera · ${s.posicao}º lugar` : "Lista de espera",
      frase: `As salas de ${s.foco} estão cheias agora. Se abrir vaga, a secretaria chama pela ordem da fila. Consulte aqui de vez em quando.`,
    };
  }
  if (s.sala) {
    return {
      titulo: `Sala ${s.sala}`,
      frase: s.status === "confirmada"
        ? "Matrícula confirmada. Esta é a sua sala."
        : "Esta é a sua sala. A matrícula ainda precisa ser confirmada na secretaria, com o RG original.",
    };
  }
  return { titulo: "Sala a definir", frase: "A secretaria vai definir a sua sala. Consulte aqui de novo em alguns dias." };
}

/**
 * Inscrições repetidas: mesmo nome (sem acento/maiúscula) + mesma data de
 * nascimento, ou mesmo celular. Cancelada não conta. Devolve id → motivo.
 */
export function repetidas(lista: Pick<Matricula, "id" | "nome" | "nascimento" | "celular" | "status">[]): Map<string, string> {
  const porPessoa = new Map<string, string[]>();
  const porCelular = new Map<string, string[]>();
  for (const m of lista) {
    if (m.status === "cancelada") continue;
    const k = `${normalizarNome(m.nome)}|${m.nascimento}`;
    porPessoa.set(k, [...(porPessoa.get(k) ?? []), m.id]);
    porCelular.set(m.celular, [...(porCelular.get(m.celular) ?? []), m.id]);
  }
  const r = new Map<string, string>();
  for (const ids of porPessoa.values()) if (ids.length > 1) ids.forEach((id) => r.set(id, "Mesmo nome e nascimento"));
  for (const ids of porCelular.values()) if (ids.length > 1) ids.forEach((id) => { if (!r.has(id)) r.set(id, "Mesmo celular"); });
  return r;
}

export interface PreviaDoSorteio {
  foco: Foco;
  vagas: number;
  candidatos: number;
  entram: number;
  espera: number;
  salas: { sala: number; capacidade: number; agora: number; depois: number }[];
}

/**
 * O que o "preencher vagas" faria, em números (quem cai onde só o banco decide).
 * Mesma regra de `sortear_salas_matricula()`: concorrem Recebidas/Confirmadas
 * sem sala e a Lista de espera; entram até as vagas; cada um vai para a sala
 * menos cheia do foco.
 */
export function previaDoSorteio(
  foco: Foco,
  matriculas: Pick<Matricula, "foco" | "status" | "sala">[],
  salas: SalaDaMatricula[],
  refazer = false,
): PreviaDoSorteio {
  const doFoco = matriculas.filter((m) => m.foco === foco);
  const minhas = salas.filter((s) => s.foco === foco).sort((a, b) => a.sala - b.sala);
  const ocup = new Map(minhas.map((s) => [s.sala, 0]));
  if (!refazer) for (const m of doFoco) if (ocupaSala(m) && ocup.has(m.sala!)) ocup.set(m.sala!, ocup.get(m.sala!)! + 1);
  const agora = new Map(ocup);
  const candidatos = doFoco.filter((m) => (TEM_SALA.includes(m.status) && (refazer || !m.sala)) || m.status === "espera").length;
  const capTotal = minhas.reduce((t, s) => t + s.capacidade, 0);
  const ocupTotal = [...ocup.values()].reduce((t, n) => t + n, 0);
  const vagas = Math.max(0, capTotal - ocupTotal);
  const entram = Math.min(vagas, candidatos);
  for (let i = 0; i < entram; i++) {
    const alvo = minhas.filter((s) => ocup.get(s.sala)! < s.capacidade)
      .sort((a, b) => ocup.get(a.sala)! - ocup.get(b.sala)! || a.sala - b.sala)[0];
    if (!alvo) break;
    ocup.set(alvo.sala, ocup.get(alvo.sala)! + 1);
  }
  return {
    foco, vagas, candidatos, entram, espera: candidatos - entram,
    salas: minhas.map((s) => ({ sala: s.sala, capacidade: s.capacidade, agora: agora.get(s.sala)!, depois: ocup.get(s.sala)! })),
  };
}

// ── Excel ───────────────────────────────────────────────────────────────────
export function linhaDoExcel(m: Matricula, hoje: string): Record<string, string | number> {
  return {
    Protocolo: m.protocolo,
    Status: statusParaMostrar(m),
    Sala: m.sala ?? "",
    Nome: m.nome,
    Nascimento: dataBR(m.nascimento),
    Idade: idade(m.nascimento, hoje),
    Foco: m.foco,
    Série: rotulo(SERIES, m.serie),
    Escola: m.escola,
    "Tipo de escola": rotulo(ESCOLA_TIPOS, m.escola_tipo),
    "Turno na escola": rotulo(TURNOS, m.turno_escola),
    Celular: formatarCelular(m.celular),
    "E-mail": m.email ?? "",
    Bairro: m.bairro,
    Cidade: m.cidade,
    Responsável: m.resp_nome ?? "",
    Parentesco: m.resp_parentesco ?? "",
    "Celular do responsável": formatarCelular(m.resp_celular),
    "Já fez cursinho": m.ja_fez_cursinho ? "Sim" : "Não",
    "Ex-aluno Compromisso": m.ex_aluno ? "Sim" : "Não",
    "Como conheceu": m.como_conheceu ?? "",
    "Autoriza imagem": m.aceite_imagem ? "Sim" : "Não",
    Origem: m.origem === "site" ? "Site" : "Secretaria",
    "Inscrito em": instante(m.created_at),
    Observações: m.observacoes ?? "",
  };
}

/** Abas: Geral, uma por sala (por nome), Lista de espera. Nomes de aba ≤ 31. */
export function abasDoExcel(lista: Matricula[], hoje: string): { nome: string; linhas: Record<string, string | number>[] }[] {
  const porNome = (a: Matricula, b: Matricula) => a.nome.localeCompare(b.nome, "pt-BR");
  const abas = [{ nome: "Geral", linhas: [...lista].sort((a, b) => a.numero - b.numero).map((m) => linhaDoExcel(m, hoje)) }];
  const salas = [...new Set(lista.filter(ocupaSala).map((m) => m.sala!))].sort((a, b) => a - b);
  for (const s of salas) {
    const daSala = lista.filter((m) => ocupaSala(m) && m.sala === s).sort(porNome);
    abas.push({ nome: `Sala ${s} (${daSala[0].foco})`, linhas: daSala.map((m) => linhaDoExcel(m, hoje)) });
  }
  const espera = lista.filter((m) => m.status === "espera").sort((a, b) => a.numero - b.numero);
  if (espera.length) abas.push({ nome: "Lista de espera", linhas: espera.map((m) => linhaDoExcel(m, hoje)) });
  return abas;
}

// ── Impressão ───────────────────────────────────────────────────────────────
export function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Uma folha por sala, em ordem alfabética, com coluna de assinatura. */
export function listasDasSalasHtml(lista: Matricula[], salas: SalaDaMatricula[], ano = ANO_MATRICULA): string {
  const paginas = [...salas].sort((a, b) => a.sala - b.sala).map((s) => {
    const daSala = lista.filter((m) => ocupaSala(m) && m.sala === s.sala)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (!daSala.length) return "";
    return `<div class="pagina"><h1>Sala ${s.sala} · ${esc(s.foco)} · ${ano}</h1>
      <div class="sub">Cursinho Compromisso · ${daSala.length} aluno(s)</div>
      <table><thead><tr><th>#</th><th>Protocolo</th><th>Nome</th><th>Celular</th><th>Situação</th><th class="ass">Assinatura</th></tr></thead><tbody>
      ${daSala.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.protocolo)}</td><td>${esc(m.nome)}</td><td>${esc(formatarCelular(m.celular))}</td><td>${m.status === "confirmada" ? "Confirmada" : "Falta confirmar"}</td><td></td></tr>`).join("")}
      </tbody></table></div>`;
  }).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Salas ${ano}</title><style>
    body{font-family:Arial,sans-serif;margin:24px;color:#111} h1{font-size:20px;margin:0} .sub{color:#555;font-size:12px;margin:4px 0 12px}
    table{width:100%;border-collapse:collapse;font-size:12px} th,td{border:1px solid #999;padding:6px 8px;text-align:left} th{background:#f2f2f2}
    .ass{width:35%} .pagina{page-break-after:always} .pagina:last-child{page-break-after:auto}
  </style></head><body>${paginas || "<p>Ninguém nas salas ainda.</p>"}
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
}

/** Recado pronto para o WhatsApp e o Instagram. */
export function recadoDaMatricula(link: string, t: Pick<TurmaDaMatricula, "ano" | "fecha_em">): string {
  return [
    `📚 *Inscrições abertas — Cursinho Compromisso ${t.ano}*`,
    "",
    "Preparatório para ETEC e ENEM em Santana de Parnaíba.",
    "Preencha a ficha de inscrição pelo celular (uns 5 minutos) e veja a sua sala na hora:",
    link,
    "",
    `🗓️ Inscrições até ${instante(t.fecha_em)}`,
    "👨‍👩‍👧 Menor de 18 anos: precisa dos dados do responsável.",
    "🔎 Já se inscreveu? No mesmo link, toque em \"Consultar inscrição\".",
    "📄 Depois a secretaria chama para confirmar a matrícula com RG original e o responsável.",
  ].join("\n");
}
