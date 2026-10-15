import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, RefreshCw, WifiOff } from "lucide-react";
import { mensagemDaVerificacao, type Verificacao } from "@/lib/live-video";
import { CARTAO } from "./pecas";

/**
 * O resultado da verificação do vídeo, só desenho, para o estúdio do
 * professor. Verde: abre para o aluno. Vermelho: o YouTube garante que não
 * abre (a sala não vai abrir até consertar). Âmbar: não deu para perguntar.
 */
export function VerificacaoDoVideo({
  verificacao,
  verificando,
  onVerificar,
}: {
  verificacao: Verificacao | null;
  verificando: boolean;
  onVerificar: () => void;
}) {
  if (!verificacao && verificando) {
    return (
      <section className={`${CARTAO} p-3 md:p-4 flex items-center gap-3`} aria-busy="true" aria-label="Conferindo o vídeo">
        <Loader2 className="h-4 w-4 animate-spin text-white/50 shrink-0" />
        <p className="text-xs font-semibold text-white/60">Conferindo com o YouTube se o vídeo abre para os alunos…</p>
      </section>
    );
  }
  if (!verificacao) return null;

  const { titulo, descricao } = mensagemDaVerificacao(verificacao);
  const tom = verificacao.ok ? "ok" : verificacao.definitivo ? "erro" : "aviso";
  const estilo = {
    ok: "border-emerald-500/30 bg-emerald-500/5",
    erro: "border-red-500/40 bg-red-500/10",
    aviso: "border-amber-500/30 bg-amber-500/5",
  }[tom];
  const Icone = tom === "ok" ? CheckCircle2 : tom === "erro" ? AlertTriangle : WifiOff;
  const corDoIcone = tom === "ok" ? "text-emerald-400" : tom === "erro" ? "text-red-300" : "text-amber-300";

  return (
    <section className={`${CARTAO} ${estilo} p-3 md:p-4`} aria-live="polite" aria-label="Verificação do vídeo">
      <div className="flex items-start gap-3">
        <Icone className={`h-5 w-5 shrink-0 mt-0.5 ${corDoIcone}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black italic text-white leading-tight">{titulo}</p>
          <p className="text-xs font-medium text-white/65 mt-1 leading-snug break-words">{descricao}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3 sm:pl-8">
        <button
          type="button"
          onClick={onVerificar}
          disabled={verificando}
          className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
        >
          {verificando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Verificar de novo
        </button>
        {tom === "erro" && (
          <Link
            href="/dashboard/teacher/live"
            className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Pencil className="h-3 w-3" /> Editar aula
          </Link>
        )}
      </div>
    </section>
  );
}
