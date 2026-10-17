"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, EyeOff, Eye, Loader2, MessageCircleOff, MessagesSquare, Pin, PinOff, Send, ShieldCheck, SmilePlus, Volume2, VolumeX } from "lucide-react";
import {
  LIMITE_DA_MENSAGEM,
  REACOES,
  corDoAvatar,
  corDoNome,
  horaDaMensagem,
  inicialDoNome,
  nomeCurto,
  type Emoji,
  type MensagemDoChat,
  type MensagemFixada,
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
  onFixar,
}: {
  m: MensagemDoChat;
  minha: boolean;
  podeModerar: boolean;
  aberta: boolean;
  calado: boolean;
  onAlternar: (id: number) => void;
  onOcultar?: (id: number, oculta: boolean) => void;
  onSilenciar?: (userId: string, silenciar: boolean) => void;
  onFixar?: (id: number | null) => void;
}) {
  const primeiroNome = nomeCurto(m.user_name).split(" ")[0];
  return (
    <div className={m.oculta ? "opacity-45" : undefined}>
      {/* Tocar mostra o horário (17/10: sair de cada linha deixou o chat com
          cara de app de live, não de planilha) e, para a equipe, as ações. */}
      <button
        type="button"
        onClick={() => onAlternar(m.id)}
        className={`w-full text-left rounded-xl px-1.5 py-1 flex items-start gap-2 hover:bg-white/5 active:bg-white/10 ${
          m.equipe ? "bg-orange-500/10 ring-1 ring-orange-500/20 my-0.5" : ""
        } ${aberta ? "bg-white/5" : ""}`}
      >
        <span
          aria-hidden
          className={`mt-px h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black text-white [text-shadow:none] ${
            m.equipe ? "bg-orange-500" : corDoAvatar(m.user_id)
          }`}
        >
          {m.equipe ? <ShieldCheck className="h-3.5 w-3.5" /> : inicialDoNome(m.user_name)}
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-snug break-words">
          <span className={`font-black ${m.equipe ? "text-orange-300" : minha ? "text-white" : corDoNome(m.user_id)}`}>
            {nomeCurto(m.user_name)}
            {minha && !m.equipe && <span className="text-white/40 font-bold"> (você)</span>}
          </span>
          {calado && <VolumeX className="inline h-3 w-3 text-red-300 ml-1 -mt-0.5" aria-label="Silenciado" />}
          <span className="text-white/35">: </span>
          <span className={m.equipe ? "text-white font-semibold" : "text-white/85 font-medium"}>
            {m.oculta ? <em className="text-white/50">{m.texto ? `${m.texto} · oculta` : "mensagem oculta"}</em> : m.texto}
          </span>
        </p>
      </button>
      {aberta && (
        <div className="flex flex-wrap items-center gap-1.5 pl-9 pr-2 pb-1.5">
          <span className="text-[10px] text-white/40 font-semibold tabular-nums mr-1">às {horaDaMensagem(m.created_at)}</span>
          {onFixar && !m.oculta && (
            <button
              type="button"
              onClick={() => {
                onFixar(m.id);
                onAlternar(m.id);
              }}
              className="h-9 px-3 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <Pin className="h-3.5 w-3.5" /> Fixar
            </button>
          )}
          {podeModerar && (
          <>
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
          </>
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
  sobreposto = false,
  fixada = null,
  onFixar,
  reacoes = [],
  onReagir,
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
  /**
   * Tela cheia da sala (17/10), no jeito do YouTube: sem cartão, por cima do
   * vídeo, e as mensagens somem num degradê no alto conforme as novas sobem.
   * Sombra no texto para ler sobre qualquer imagem.
   */
  sobreposto?: boolean;
  /** Mensagem presa no topo pela equipe. */
  fixada?: MensagemFixada | null;
  /** Só a equipe: fixa (id) ou solta (null). */
  onFixar?: (id: number | null) => void;
  /** Reações subindo agora (as da turma e as minhas). */
  reacoes?: { chave: string; emoji: string }[];
  /** Com a aula no ar: manda uma reação rápida. */
  onReagir?: (emoji: Emoji) => void;
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

  // Bandeja de reações (abre por cima do campo, sem ocupar espaço fixo) e a
  // fixada recolhida em uma linha: em 360×740 as duas juntas deixavam uma
  // mensagem e meia visível no chat.
  const [bandeja, setBandeja] = useState(false);
  const [fixadaAberta, setFixadaAberta] = useState(false);

  const podeEscrever = noAr && (souEquipe || !silenciado);
  const bloqueado = !podeEscrever || enviando || espera > 0;

  return (
    <section
      className={sobreposto ? "h-full min-h-0 flex flex-col [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]" : `${CARTAO} overflow-hidden flex flex-col ${preencher ? "h-full min-h-0" : ""}`}
      aria-label="Chat da aula"
    >
      {/* No modo preencher (sala no celular) a aba "Chat" já diz o que é: o
          cabeçalho some e o espaço vai para as mensagens. */}
      <div className={`${sobreposto ? "hidden" : preencher ? "hidden lg:flex" : "flex"} items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-white/5 shrink-0`}>
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

      {fixada?.texto && (
        <div
          className={`shrink-0 mx-2 mt-2 rounded-xl px-3 py-1.5 flex items-start gap-2 ${
            sobreposto ? "bg-black/60 backdrop-blur-sm" : "bg-orange-500/10 ring-1 ring-orange-500/25"
          }`}
          role="note"
          aria-label="Mensagem fixada"
        >
          <Pin className="h-3.5 w-3.5 text-orange-300 mt-0.5 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={() => setFixadaAberta((a) => !a)}
            aria-expanded={fixadaAberta}
            className={`min-w-0 flex-1 text-left text-[12px] leading-snug text-white/90 break-words ${fixadaAberta ? "" : "line-clamp-1"}`}
          >
            <span className="font-black text-orange-300">{nomeCurto(fixada.autor)}: </span>
            {fixada.texto}
          </button>
          {onFixar && (
            <button
              type="button"
              onClick={() => onFixar(null)}
              aria-label="Soltar a mensagem fixada"
              className="h-7 w-7 -mr-1 -mt-0.5 shrink-0 rounded-lg text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center"
            >
              <PinOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className={`relative ${preencher ? "flex-1 min-h-0" : ""}`}>
        <div
          ref={lista}
          onScroll={aoRolar}
          className={`${preencher ? "h-full" : altura} overflow-y-auto ${preencher ? "overscroll-contain" : "lg:overscroll-contain"} px-3 py-2 space-y-0.5 [-webkit-overflow-scrolling:touch] ${
            sobreposto ? "[mask-image:linear-gradient(to_bottom,transparent,black_40%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_40%)]" : ""
          }`}
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
                onFixar={onFixar}
              />
            ))
          )}
        </div>

        {/* Reações subindo, como no YouTube. Só transform/opacity (regra 4 do mascote vale aqui também). */}
        <div className="pointer-events-none absolute right-2 bottom-1 w-12 h-3/4" aria-hidden>
          {reacoes.map((r) => {
            let h = 0;
            for (let i = 0; i < r.chave.length; i++) h = (h * 31 + r.chave.charCodeAt(i)) >>> 0;
            return (
              <span key={r.chave} className="reacao-sobe absolute bottom-0 text-2xl leading-none" style={{ right: `${h % 28}px` }}>
                {r.emoji}
              </span>
            );
          })}
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

      <div className={`relative ${sobreposto ? "" : "border-t border-white/5"} p-2.5 shrink-0`}>
        {!noAr ? (
          <p className="text-[11px] text-white/45 font-semibold text-center py-2">O chat abre quando a aula estiver no ar.</p>
        ) : !souEquipe && silenciado ? (
          <p className="text-[11px] text-red-300/90 font-semibold text-center py-2 flex items-center justify-center gap-1.5">
            <MessageCircleOff className="h-3.5 w-3.5" /> O professor pausou suas mensagens nesta aula.
          </p>
        ) : (
          <>
          {onReagir && bandeja && (
            <div
              className="absolute left-2.5 bottom-full mb-1 z-10 flex items-center gap-1 rounded-2xl bg-neutral-900/95 ring-1 ring-white/10 p-1 shadow-2xl [text-shadow:none]"
              role="group"
              aria-label="Reações rápidas"
            >
              {REACOES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onReagir(e)}
                  aria-label={`Reagir com ${e}`}
                  className="h-11 w-11 rounded-xl text-xl leading-none hover:bg-white/10 transition-transform active:scale-90 touch-manipulation"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!bloqueado) onEnviar();
            }}
            className="flex items-center gap-2"
          >
            {onReagir && (
              <button
                type="button"
                onClick={() => setBandeja((b) => !b)}
                aria-expanded={bandeja}
                aria-label={bandeja ? "Fechar reações" : "Reagir"}
                className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center touch-manipulation ${
                  bandeja ? "bg-orange-500/20 text-orange-200" : sobreposto ? "bg-black/55 text-white/80" : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <SmilePlus className="h-5 w-5" />
              </button>
            )}
            <input
              value={texto}
              onChange={(e) => onTexto(e.target.value.slice(0, LIMITE_DA_MENSAGEM))}
              placeholder={souEquipe ? "Escreva para a turma…" : "Mensagem para a turma…"}
              maxLength={LIMITE_DA_MENSAGEM}
              enterKeyHint="send"
              autoComplete="off"
              aria-label="Mensagem do chat"
              className={`flex-1 min-w-0 h-11 rounded-xl ${sobreposto ? "bg-black/55 backdrop-blur-sm" : "bg-white/5"} border border-white/10 focus:border-orange-500/50 px-3.5 text-[16px] sm:text-sm text-white placeholder:text-white/35 outline-none`}
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
          </>
        )}
      </div>
    </section>
  );
}
