"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, EyeOff, Eye, Loader2, MessageCircleOff, MessagesSquare, Send, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import {
  LIMITE_DA_MENSAGEM,
  corDoNome,
  horaDaMensagem,
  nomeCurto,
  type MensagemDoChat,
} from "@/lib/live-chat";
import { CARTAO } from "./pecas";

/**
 * Uma linha do chat. Memorizada: quando chega mensagem nova, quando o aluno
 * digita ou quando a presença atualiza, só a linha que mudou é redesenhada.
 * Antes, o chat inteiro (até 200 linhas) era refeito a cada uma dessas coisas,
 * e num celular fraco isso congelava a tela por 130–220 ms no meio da rolagem.
 */
const LinhaDoChat = memo(function LinhaDoChat({
  m,
  minha,
  podeModerar,
  aberta,
  calado,
  onAlternar,
  onOcultar,
  onSilenciar,
}: {
  m: MensagemDoChat;
  minha: boolean;
  podeModerar: boolean;
  aberta: boolean;
  calado: boolean;
  onAlternar: (id: number) => void;
  onOcultar?: (id: number, oculta: boolean) => void;
  onSilenciar?: (userId: string, silenciar: boolean) => void;
}) {
  const primeiroNome = nomeCurto(m.user_name).split(" ")[0];
  return (
    <div className={m.oculta ? "opacity-45" : undefined}>
      <button
        type="button"
        disabled={!podeModerar}
        onClick={() => onAlternar(m.id)}
        className={`w-full text-left rounded-xl px-2 py-1.5 ${m.equipe ? "bg-orange-500/10 ring-1 ring-orange-500/20 my-1" : ""} ${
          podeModerar ? "hover:bg-white/5 active:bg-white/10 cursor-pointer" : "cursor-default"
        } ${aberta ? "bg-white/5" : ""}`}
      >
        <p className="text-[13px] leading-snug break-words">
          <span className="text-[10px] text-white/30 font-semibold tabular-nums mr-1.5">{horaDaMensagem(m.created_at)}</span>
          {m.equipe && <ShieldCheck className="inline h-3.5 w-3.5 text-orange-400 mr-1 -mt-0.5" aria-label="Professor" />}
          <span className={`font-black ${m.equipe ? "text-orange-300" : minha ? "text-white" : corDoNome(m.user_id)}`}>
            {nomeCurto(m.user_name)}
            {minha && !m.equipe && <span className="text-white/40 font-bold"> (você)</span>}
          </span>
          {calado && <VolumeX className="inline h-3 w-3 text-red-300 ml-1 -mt-0.5" aria-label="Silenciado" />}
          <span className="text-white/35">: </span>
          <span className={m.equipe ? "text-white font-semibold" : "text-white/85 font-medium"}>
            {m.oculta ? <em className="text-white/50">{m.texto ?? "mensagem oculta"} · oculta</em> : m.texto}
          </span>
        </p>
      </button>
      {podeModerar && aberta && (
        <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
          <button
            type="button"
            onClick={() => {
              onOcultar?.(m.id, !m.oculta);
              onAlternar(m.id);
            }}
            className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            {m.oculta ? <><Eye className="h-3.5 w-3.5" /> Reexibir</> : <><EyeOff className="h-3.5 w-3.5" /> Ocultar</>}
          </button>
          {onSilenciar && (
            <button
              type="button"
              onClick={() => {
                onSilenciar(m.user_id, !calado);
                onAlternar(m.id);
              }}
              className={`h-9 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                calado ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "bg-red-500/15 text-red-300 hover:bg-red-500/25"
              }`}
            >
              {calado ? <><Volume2 className="h-3.5 w-3.5" /> Liberar {primeiroNome}</> : <><VolumeX className="h-3.5 w-3.5" /> Silenciar {primeiroNome}</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Chat ao vivo da aula, só desenho. O mesmo componente serve o aluno (sala) e
 * a equipe (estúdio); com `souEquipe`, tocar numa mensagem de aluno abre as
 * ações de moderação. Os dados chegam prontos de `ChatDaAula`.
 *
 * `preencher`: o chat ocupa toda a altura que o pai der (a lista estica e o
 * campo de digitar fica sempre embaixo). É o modo da sala no celular, onde a
 * página não rola — só o chat — para não haver rolagem dentro de rolagem.
 */
export function ChatAoVivo({
  mensagens,
  meuId,
  souEquipe,
  noAr,
  silenciado,
  silenciados = [],
  texto,
  onTexto,
  onEnviar,
  enviando,
  espera = 0,
  onOcultar,
  onSilenciar,
  altura = "h-[360px] sm:h-[420px] lg:h-[480px]",
  preencher = false,
}: {
  mensagens: MensagemDoChat[] | null;
  meuId: string | null;
  souEquipe: boolean;
  noAr: boolean;
  silenciado: boolean;
  silenciados?: string[];
  texto: string;
  onTexto: (t: string) => void;
  onEnviar: () => void;
  enviando: boolean;
  /** Segundos até poder mandar de novo (só aluno). */
  espera?: number;
  onOcultar?: (id: number, oculta: boolean) => void;
  onSilenciar?: (userId: string, silenciar: boolean) => void;
  altura?: string;
  preencher?: boolean;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const colado = useRef(true);
  const [novas, setNovas] = useState(0);
  const [aberta, setAberta] = useState<number | null>(null);
  const totalAntes = useRef(0);

  // Fica grudado no fim enquanto o aluno não rolou para cima para ler algo.
  // `colado` é ref (não estado): rolar não redesenha o chat.
  useLayoutEffect(() => {
    const el = lista.current;
    const total = mensagens?.length ?? 0;
    if (!el) return;
    if (colado.current) {
      el.scrollTop = el.scrollHeight;
    } else if (total > totalAntes.current) {
      // A diferença é calculada AGORA: dentro do `setNovas(n => …)` ela seria
      // lida depois de `totalAntes` já ter sido atualizado, e daria zero.
      const chegaram = total - totalAntes.current;
      setNovas((n) => n + chegaram);
    }
    totalAntes.current = total;
  }, [mensagens]);

  const aoRolar = useCallback(() => {
    const el = lista.current;
    if (!el) return;
    const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    colado.current = perto;
    if (perto) setNovas((n) => (n === 0 ? n : 0));
  }, []);

  const irParaOFim = () => {
    const el = lista.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    colado.current = true;
    setNovas(0);
  };

  const alternar = useCallback((id: number) => setAberta((a) => (a === id ? null : id)), []);

  useEffect(() => setAberta(null), [noAr]);

  const podeEscrever = noAr && (souEquipe || !silenciado);
  const bloqueado = !podeEscrever || enviando || espera > 0;

  return (
    <section className={`${CARTAO} overflow-hidden flex flex-col ${preencher ? "h-full min-h-0" : ""}`} aria-label="Chat da aula">
      {/* No modo preencher (sala no celular) a aba "Chat" já diz o que é: o
          cabeçalho some e o espaço vai para as mensagens. */}
      <div className={`${preencher ? "hidden lg:flex" : "flex"} items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-white/5 shrink-0`}>
        <div className="flex items-center gap-2 min-w-0">
          <MessagesSquare className="h-4 w-4 text-orange-400 shrink-0" />
          <h2 className="text-sm font-black italic text-white truncate">Chat da aula</h2>
          {noAr && (
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-red-500/15 text-red-300 text-[9px] font-black uppercase tracking-widest shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Ao vivo
            </span>
          )}
        </div>
        {souEquipe && (
          <span className="text-[9px] font-black uppercase tracking-widest text-white/35 shrink-0">Toque para moderar</span>
        )}
      </div>

      <div className={`relative ${preencher ? "flex-1 min-h-0" : ""}`}>
        <div
          ref={lista}
          onScroll={aoRolar}
          className={`${preencher ? "h-full" : altura} overflow-y-auto ${preencher ? "overscroll-contain" : "lg:overscroll-contain"} px-3 py-2 space-y-0.5 [-webkit-overflow-scrolling:touch]`}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {mensagens === null ? (
            <div className="h-full flex items-center justify-center" aria-busy="true">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
            </div>
          ) : mensagens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-6">
              <MessagesSquare className="h-7 w-7 text-white/15" />
              <p className="text-xs font-semibold text-white/45 leading-relaxed">
                {noAr ? "Ninguém escreveu ainda. Diga oi para a turma!" : "O chat abre quando a aula estiver no ar."}
              </p>
            </div>
          ) : (
            mensagens.map((m) => (
              <LinhaDoChat
                key={m.id}
                m={m}
                minha={m.user_id === meuId}
                podeModerar={souEquipe && !m.equipe && !!onOcultar}
                aberta={aberta === m.id}
                calado={silenciados.includes(m.user_id)}
                onAlternar={alternar}
                onOcultar={onOcultar}
                onSilenciar={onSilenciar}
              />
            ))
          )}
        </div>

        {novas > 0 && (
          <button
            type="button"
            onClick={irParaOFim}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 h-9 px-3.5 rounded-full bg-orange-500 text-white text-[11px] font-black shadow-lg flex items-center gap-1.5"
          >
            <ArrowDown className="h-3.5 w-3.5" /> {novas === 1 ? "1 nova mensagem" : `${novas} novas mensagens`}
          </button>
        )}
      </div>

      <div className="border-t border-white/5 p-2.5 shrink-0">
        {!noAr ? (
          <p className="text-[11px] text-white/45 font-semibold text-center py-2">O chat abre quando a aula estiver no ar.</p>
        ) : !souEquipe && silenciado ? (
          <p className="text-[11px] text-red-300/90 font-semibold text-center py-2 flex items-center justify-center gap-1.5">
            <MessageCircleOff className="h-3.5 w-3.5" /> O professor pausou suas mensagens nesta aula.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!bloqueado) onEnviar();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={texto}
              onChange={(e) => onTexto(e.target.value.slice(0, LIMITE_DA_MENSAGEM))}
              placeholder={souEquipe ? "Escreva para a turma…" : "Mensagem para a turma…"}
              maxLength={LIMITE_DA_MENSAGEM}
              enterKeyHint="send"
              autoComplete="off"
              aria-label="Mensagem do chat"
              className="flex-1 min-w-0 h-11 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500/50 px-3.5 text-[16px] sm:text-sm text-white placeholder:text-white/35 outline-none"
            />
            <button
              type="submit"
              disabled={bloqueado || !texto.trim()}
              aria-label="Enviar"
              className="h-11 min-w-11 px-3 shrink-0 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-white/10 disabled:text-white/40 text-white flex items-center justify-center gap-1 text-xs font-black touch-manipulation"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : espera > 0 ? <span className="tabular-nums">{espera}s</span> : <Send className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
