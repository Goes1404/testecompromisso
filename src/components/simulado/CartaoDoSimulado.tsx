"use client";

import {
  ClipboardCheck, Loader2, CalendarDays, MapPin, Clock, Printer, CheckCircle2,
  IdCard, AlertTriangle, Hourglass, DoorOpen, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  SimuladoDoAluno, faseDoSimulado, diaDoSimulado, instante, numeroDeInscricao,
  ondeFica, LEVAR_NO_DIA, fichaHtml, imprimir,
} from "@/lib/simulado-presencial";

/**
 * Cartão do simulado presencial para o aluno: inscrição, ficha e sala.
 * Só desenha — quem busca e inscreve é a página (`student/simulado-presencial`),
 * para dar para revisar o desenho em `/dev/simulado-preview` sem login.
 * `agora` existe para a prévia; na tela vale o relógio do aparelho.
 */
export function CartaoDoSimulado({ s, inscrevendo, onInscrever, agora }: { s: SimuladoDoAluno; inscrevendo: boolean; onInscrever: () => void; agora?: Date }) {
  const { toast } = useToast();
  const fase = faseDoSimulado(s, agora);
  const i = s.inscricao;

  const abrirFicha = () => {
    if (!i) return;
    if (!imprimir(fichaHtml(s, i))) {
      toast({ title: "O navegador bloqueou a janela", description: "Libere pop-ups para este site ou tire um print desta tela.", variant: "destructive" });
    }
  };

  return (
    <section className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Cabeçalho do simulado */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white p-6 md:p-8">
        <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter leading-tight">{s.titulo}</h2>
        <div className="flex flex-wrap gap-2 mt-3">
          <Etiqueta icon={CalendarDays}>{diaDoSimulado(s.aplicado_em)}</Etiqueta>
          {s.horario && <Etiqueta icon={Clock}>{s.horario}</Etiqueta>}
          {s.local && <Etiqueta icon={MapPin}>{s.local}</Etiqueta>}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {!s.elegivel ? (
          <Aviso icon={Lock} cor="slate" titulo={`Este simulado é para alunos ${s.publico}.`}>
            Se o seu foco está errado no cadastro, fale com a secretaria.
          </Aviso>
        ) : !i ? (
          fase === "em_breve" ? (
            <Aviso icon={Hourglass} cor="slate" titulo={`Inscrições abrem em ${instante(s.inscricao_abre)}`}>
              Vão até {instante(s.inscricao_fecha)}. Volte aqui nesse período — é obrigatório.
            </Aviso>
          ) : fase === "inscricoes" ? (
            <div className="space-y-4">
              <Aviso icon={AlertTriangle} cor="orange" titulo="Inscrição obrigatória">
                Faça até {instante(s.inscricao_fecha)}. Sem inscrição você não tem sala sorteada.
              </Aviso>
              <Button
                onClick={onInscrever}
                disabled={inscrevendo}
                className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-widest shadow-lg active:scale-[0.98]"
              >
                {inscrevendo ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5 mr-2" /> Fazer minha inscrição</>}
              </Button>
            </div>
          ) : (
            <Aviso icon={AlertTriangle} cor="red" titulo="As inscrições encerraram">
              Você não se inscreveu. Procure a secretaria — no dia, quem chega sem inscrição faz a prova nas salas de reserva.
            </Aviso>
          )
        ) : (
          <>
            {/* Ficha */}
            <div className="rounded-[2rem] border-2 border-dashed border-orange-300 dark:border-orange-500/40 p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Nº de inscrição</span>
                  <p className="text-4xl font-black tracking-widest text-slate-900 dark:text-white tabular-nums">{numeroDeInscricao(i.numero)}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 px-3 h-7 text-[10px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Inscrito
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <Campo rotulo="Aluno(a)" valor={i.nome} />
                <Campo rotulo="Turma" valor={i.turma ? `Turma ${i.turma}` : "—"} />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Sala da prova</span>
                {i.sala ? (
                  <div className="flex items-center gap-3 mt-1">
                    <DoorOpen className="h-7 w-7 text-orange-500 shrink-0" />
                    <div>
                      <p className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white">{ondeFica(i.sala, i.predio)}</p>
                      {i.carteira && <p className="text-sm font-bold text-slate-500">Carteira {i.carteira}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">
                    {fase === "sala_divulgada"
                      ? "Sua sala ainda não foi definida. Procure a secretaria."
                      : `Sai aqui em ${instante(s.salas_divulgadas_em)}.`}
                  </p>
                )}
              </div>

              <Button onClick={abrirFicha} variant="outline" className="w-full sm:w-auto mt-5 h-12 rounded-xl font-black text-xs uppercase tracking-widest">
                <Printer className="h-4 w-4 mr-2" /> Imprimir ficha
              </Button>
            </div>
          </>
        )}

        {/* Leve no dia */}
        {s.elegivel && (
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <IdCard className="h-4 w-4" /> No dia, leve
            </h3>
            <ul className="space-y-2">
              {LEVAR_NO_DIA.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            {s.instrucoes && (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">{s.instrucoes}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Etiqueta({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-3 h-8 text-xs font-black">
      <Icon className="h-3.5 w-3.5" /> {children}
    </span>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{rotulo}</span>
      <p className="font-black text-slate-900 dark:text-white leading-snug">{valor}</p>
    </div>
  );
}

const CORES = {
  orange: "bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-100",
  red: "bg-red-50 border-red-200 text-red-900 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-100",
  slate: "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-100",
};

function Aviso({ icon: Icon, cor, titulo, children }: { icon: any; cor: keyof typeof CORES; titulo: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-4 flex gap-3 ${CORES[cor]}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-black">{titulo}</p>
        <p className="text-sm font-medium opacity-80 mt-0.5">{children}</p>
      </div>
    </div>
  );
}
