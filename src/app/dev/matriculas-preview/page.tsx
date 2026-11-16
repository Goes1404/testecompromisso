"use client";

/**
 * Prévia da matrícula 2027 com dados de exemplo, sem login (só fora de produção).
 * `/dev/matriculas-preview?tela=ficha|painel`
 */
import { Suspense, useMemo, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { FormularioDaFicha } from "@/components/matricula/FormularioDaFicha";
import { PainelDeMatriculas, AcoesDoPainel } from "@/components/matricula/PainelDeMatriculas";
import { Matricula, SalaDaMatricula, TurmaDaMatricula, FICHA_VAZIA, Foco, previaDoSorteio } from "@/lib/matricula";

const NOMES = ["Ana Beatriz Souza", "Bruno Henrique Lima", "Carla Dias Pereira", "Davi Lucas Martins", "Eduarda Alves Rocha", "Felipe Costa Nunes",
  "Gabriela Ferreira", "Heitor Gomes Silva", "Isabela Ribeiro", "João Pedro Santos", "Kauã Oliveira", "Larissa Mendes", "Matheus Araújo",
  "Nicole Barbosa", "Otávio Cardoso", "Pietra Moraes", "Rafael Teixeira", "Sofia Carvalho", "Thiago Monteiro", "Valentina Lopes"];

function exemplo(): Matricula[] {
  return NOMES.map((nome, i) => {
    const foco: Foco = i % 3 === 2 ? "ENEM" : "ETEC";
    const status = i < 4 ? "recebida" : i === 18 ? "cancelada" : i === 17 ? "espera" : "confirmada";
    return {
      ...FICHA_VAZIA, id: `m${i}`, ano: 2027, numero: i + 1, protocolo: `2027-${String(i + 1).padStart(4, "0")}`,
      nome, nascimento: foco === "ETEC" ? `2011-0${(i % 9) + 1}-1${i % 9}` : `2008-0${(i % 9) + 1}-0${(i % 9) + 1}`,
      celular: `119${String(81234500 + i * 7)}`, email: null, bairro: ["Fazendinha", "Centro", "Jardim Isaura", "Cidade São Pedro"][i % 4],
      cidade: "Santana de Parnaíba", foco, serie: foco === "ETEC" ? "9EF" : "3EM", escola: ["Leda Caira", "Colaço", "Imideo Giuseppe Nerici"][i % 3],
      escola_tipo: "publica", turno_escola: i % 2 ? "manha" : "tarde", ja_fez_cursinho: i % 5 === 0, ex_aluno: i % 7 === 0,
      resp_nome: foco === "ETEC" ? `Maria ${nome.split(" ").at(-1)}` : "", resp_parentesco: foco === "ETEC" ? "Mãe" : "", resp_celular: foco === "ETEC" ? "11998877665" : "",
      como_conheceu: "Instagram", aceite_veracidade: true, aceite_dados: true, aceite_imagem: i % 2 === 0,
      status, sala: status === "confirmada" && i % 2 === 0 ? (foco === "ETEC" ? (i % 4) + 1 : 5 + (i % 4)) : null,
      observacoes: i === 5 ? "Irmã da Ana, querem a mesma sala" : null, origem: i === 9 ? "secretaria" : "site",
      created_at: new Date(Date.UTC(2026, 10, 16, 12, i * 7)).toISOString(), updated_at: "2026-11-16T12:00:00Z",
    } as Matricula;
  }).concat([{ ...({} as Matricula), ...{
    ...FICHA_VAZIA, id: "dup", ano: 2027, numero: 21, protocolo: "2027-0021", nome: "ANA BEATRIZ SOUZA", nascimento: "2011-01-10",
    celular: "11912345678", email: null, foco: "ETEC", serie: "9EF", escola: "Leda Caira", escola_tipo: "publica", turno_escola: "manha",
    bairro: "Fazendinha", status: "recebida", sala: null, observacoes: null, origem: "site", aceite_dados: true, aceite_veracidade: true,
    created_at: "2026-11-16T15:00:00Z", updated_at: "2026-11-16T15:00:00Z",
  } } as Matricula]);
}

function Previa() {
  if (process.env.NODE_ENV === "production") notFound();
  const tela = useSearchParams().get("tela") ?? "painel";
  const [lista, setLista] = useState<Matricula[]>(exemplo);
  const [salas, setSalas] = useState<SalaDaMatricula[]>(
    [1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({ ano: 2027, sala: s, foco: s <= 4 ? "ETEC" : "ENEM", capacidade: s <= 4 ? 3 : 2 })),
  );
  const [turma, setTurma] = useState<TurmaDaMatricula>({ ano: 2027, abre_em: "2026-11-16T03:00:00Z", fecha_em: "2027-02-01T02:59:00Z", aberta: true });

  const acoes = useMemo<AcoesDoPainel>(() => ({
    atualizar: async (m, x) => { setLista((l) => l.map((y) => (y.id === m.id ? { ...y, ...x, sala: (x.status ?? y.status) === "confirmada" ? (x.sala !== undefined ? x.sala : y.sala) : null, updated_at: new Date().toISOString() } : y))); return true; },
    apagar: async (m) => { setLista((l) => l.filter((y) => y.id !== m.id)); return true; },
    historico: async () => [{ campo: "status", de: "recebida", para: "confirmada", por_nome: "Secretaria Ana", em: "2026-11-16T14:00:00Z" }],
    registrarNoBalcao: async () => ({ protocolo: "2027-0099" }),
    sortear: async (foco) => { const p = previaDoSorteio(foco, lista, salas); alert(`${p.entram} entram, ${p.espera} espera (prévia)`); },
    salvarSala: async (sala, x) => { setSalas((ss) => ss.map((s) => (s.sala === sala ? { ...s, ...x } : s))); return true; },
    criarSala: async (s) => { setSalas((ss) => [...ss, s]); return true; },
    apagarSala: async (sala) => { setSalas((ss) => ss.filter((s) => s.sala !== sala)); return true; },
    salvarTurma: async (x) => { setTurma((t) => ({ ...t, ...x })); return true; },
  }), [lista, salas]);

  if (tela === "ficha") {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-4">
        <div className="max-w-xl mx-auto rounded-[2.5rem] bg-white shadow-2xl border p-5">
          <FormularioDaFicha onEnviar={async () => ({ protocolo: "2027-0001" })} />
        </div>
      </div>
    );
  }
  return <div className="min-h-[100dvh] bg-slate-50 p-4"><PainelDeMatriculas turma={turma} salas={salas} lista={lista} hoje="2026-11-16" acoes={acoes} origem="https://compromissose.com" /></div>;
}

export default function MatriculasPreviewPage() {
  return <Suspense fallback={null}><Previa /></Suspense>;
}
