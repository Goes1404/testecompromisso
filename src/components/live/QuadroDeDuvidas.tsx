import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { LIMITE_DA_DUVIDA, type Duvida } from "@/lib/lives";
import { CARTAO, Rotulo } from "./pecas";

/** Quadro de dúvidas do aluno, só desenho. Os dados vêm de `DuvidasDoAluno`. */
export function QuadroDeDuvidas({
  duvidas,
  texto,
  onTexto,
  onEnviar,
  enviando,
  noAr,
}: {
  duvidas: Duvida[] | null;
  texto: string;
  onTexto: (t: string) => void;
  onEnviar: () => void;
  enviando: boolean;
  noAr: boolean;
}) {
  const tamanho = texto.trim().length;

  return (
    <section className={`${CARTAO} p-4 space-y-3`} aria-label="Dúvidas para o professor">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black italic text-white flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-orange-400" /> Dúvidas para o professor
          </h2>
          <p className="text-[10px] font-semibold text-white/45 mt-0.5">Só o professor vê o que você escreve aqui.</p>
        </div>
      </div>

      {noAr ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            onEnviar();
          }}
        >
          <label htmlFor="duvida" className="sr-only">Sua dúvida</label>
          <textarea
            id="duvida"
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onEnviar();
            }}
            maxLength={LIMITE_DA_DUVIDA}
            rows={3}
            disabled={enviando}
            placeholder="Ex.: não entendi por que o resultado deu negativo…"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/60 focus:bg-white/[0.07] resize-none transition-colors"
          />
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[10px] font-bold tabular-nums ${tamanho > LIMITE_DA_DUVIDA * 0.9 ? "text-orange-400" : "text-white/35"}`}>
              {tamanho}/{LIMITE_DA_DUVIDA}
            </span>
            <button
              type="submit"
              disabled={enviando || tamanho === 0}
              className="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.97] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-35 disabled:active:scale-100 transition-all touch-manipulation"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-white/50 font-medium rounded-xl bg-white/5 px-3 py-2.5">
          As dúvidas abrem quando a aula estiver no ar.
        </p>
      )}

      {duvidas && duvidas.length > 0 && (
        <div className="space-y-2 pt-1">
          <Rotulo>Suas dúvidas</Rotulo>
          <ul className="space-y-2">
            {duvidas.map((d) => (
              <li key={d.id} className="rounded-xl bg-white/[0.04] border border-white/5 p-3 space-y-2">
                <p className="text-sm text-white/90 whitespace-pre-wrap break-words leading-snug">{d.content}</p>
                {d.resposta ? (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Resposta do professor</p>
                    <p className="text-xs text-emerald-100 whitespace-pre-wrap break-words leading-snug">{d.resposta}</p>
                  </div>
                ) : (
                  <span
                    className={`inline-flex items-center h-5 px-2 rounded-md text-[9px] font-black uppercase tracking-widest ${
                      d.is_answered ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {d.is_answered ? "Respondida na aula" : "Aguardando o professor"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
