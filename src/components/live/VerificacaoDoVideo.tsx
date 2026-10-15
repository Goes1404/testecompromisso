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
  // Só a borda e um brilho no canto mudam de cor: o fundo continua o escuro do
  // CARTAO. Trocar o fundo por um tom translúcido deixava o cartão quase
  // branco sobre a página clara, com texto branco em cima — ilegível.
  const estilo = {
    ok: { borda: "border-emerald-500/40", brilho: "rgba(16,185,129,0.22)" },
    erro: { borda: "border-red-500/50", brilho: "rgba(239,68,68,0.28)" },
    aviso: { borda: "border-amber-500/40", brilho: "rgba(245,158,11,0.22)" },
  }[tom];
  const Icone = tom === "ok" ? CheckCircle2 : tom === "erro" ? AlertTriangle : WifiOff;
  const corDoIcone = tom === "ok" ? "text-emerald-400" : tom === "erro" ? "text-red-300" : "text-amber-300";

  return (
    <section className={`${CARTAO} ${estilo.borda} relative overflow-hidden p-3 md:p-4`} aria-live="polite" aria-label="Verificação do vídeo">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${estilo.brilho} 0%, transparent 55%)` }}
      />
      <div className="relative flex items-start gap-3">
        <Icone className={`h-5 w-5 shrink-0 mt-0.5 ${corDoIcone}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black italic text-white leading-tight">{titulo}</p>
          <p className="text-xs font-medium text-white/65 mt-1 leading-snug break-words">{descricao}</p>
        </div>
      </div>
      <div className="relative flex flex-wrap gap-1.5 mt-3 sm:pl-8">
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
