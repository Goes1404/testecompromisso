"use client";

/**
 * Prévia das telas do simulado presencial com dados de exemplo, sem login.
 * `/dev/simulado-preview` — todos os estados do cartão do aluno e do aviso da home.
 *
 * Só existe fora de produção.
 */
import { notFound } from "next/navigation";
import { CartaoDoSimulado } from "@/components/simulado/CartaoDoSimulado";
import { CartaoDoAviso } from "@/components/SimuladoPresencialWidget";
import { SimuladoDoAluno, INSTRUCOES_PADRAO } from "@/lib/simulado-presencial";

const BASE: SimuladoDoAluno = {
  id: "s1",
  titulo: "Simulado ETEC — 14/11",
  aplicado_em: "2026-11-14",
  horario: "8h às 12h",
  local: "Sede do Compromisso",
  publico: "todos",
  instrucoes: INSTRUCOES_PADRAO,
  agora: "",
  elegivel: true,
  inscricao: null,
  inscricao_abre: "2026-11-08T00:00:00-03:00",
  inscricao_fecha: "2026-11-11T23:59:00-03:00",
  salas_divulgadas_em: "2026-11-12T00:00:00-03:00",
};
const INSCRICAO = { numero: 137, nome: "Maria Eduarda de Oliveira Santos", turma: "4", inscrito_em: "2026-11-08T13:12:00-03:00", sala: null, predio: null, carteira: null };
const COM_SALA = { ...INSCRICAO, sala: "Sala 6", predio: "Prédio principal", carteira: 23 };

const d = (iso: string) => new Date(iso);
const ESTADOS: { nome: string; s: SimuladoDoAluno; agora: Date }[] = [
  { nome: "antes de abrir", s: BASE, agora: d("2026-11-07T10:00:00-03:00") },
  { nome: "inscrição aberta", s: BASE, agora: d("2026-11-09T10:00:00-03:00") },
  { nome: "inscrito, aguardando sala", s: { ...BASE, inscricao: INSCRICAO }, agora: d("2026-11-10T10:00:00-03:00") },
  { nome: "sala divulgada", s: { ...BASE, inscricao: COM_SALA }, agora: d("2026-11-12T10:00:00-03:00") },
  { nome: "perdeu o prazo", s: BASE, agora: d("2026-11-12T10:00:00-03:00") },
  { nome: "fora do público", s: { ...BASE, publico: "ETEC", elegivel: false }, agora: d("2026-11-09T10:00:00-03:00") },
];

export default function SimuladoPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-3 md:p-8 space-y-8">
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Aviso na home</h2>
      <div className="space-y-3 max-w-4xl">
        <CartaoDoAviso aviso={{ tipo: "inscrever", simulado: BASE }} />
        <CartaoDoAviso aviso={{ tipo: "aguardando", simulado: { ...BASE, inscricao: INSCRICAO } }} />
        <CartaoDoAviso aviso={{ tipo: "sala", simulado: { ...BASE, inscricao: COM_SALA } }} />
      </div>
      {ESTADOS.map((e) => (
        <div key={e.nome} id={e.nome.replace(/\W+/g, "-")} className="max-w-3xl space-y-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Cartão — {e.nome}</h2>
          <CartaoDoSimulado s={e.s} agora={e.agora} inscrevendo={false} onInscrever={() => {}} />
        </div>
      ))}
    </div>
  );
}
